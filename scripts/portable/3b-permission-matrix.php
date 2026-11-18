<?php
/**
 * Portable change 3b: permission test for the Content Drafters and Publishers groups.
 *
 * Asks Craft the same question its MCP server asks (craft\mcp\Authorization::allows(), which calls
 * craft\services\Elements::canView/canSave/canDelete/...) for the two test users, against real fixture
 * entries and real drafts created through Craft's drafts service. Compares each answer with what the group
 * is meant to allow, and removes the drafts it created. No SQL, no direct database writes.
 *
 * Needs the test users maya.okafor (Content Drafters) and daniel.reyes (Publishers) and the fixture guide
 * (scripts/seed-fixtures.php). Run through Craft's `exec` (it evaluates one expression):
 *
 *   ddev craft exec '(function(){ return require "/var/www/html/scripts/portable/3b-permission-matrix.php"; })()'
 */

use craft\elements\Entry;
use craft\elements\User;
use craft\mcp\Authorization;

$elements = Craft::$app->getElements();
$drafts = Craft::$app->getDrafts();

$drafter = User::find()->username('maya.okafor')->one();
$publisher = User::find()->username('daniel.reyes')->one();
if (!$drafter || !$publisher) {
    throw new RuntimeException('Test users maya.okafor / daniel.reyes not found.');
}
$section = Craft::$app->getEntries()->getSectionByHandle('guidesForTeams');
$live = Entry::find()->section('guidesForTeams')->slug('fixture-guide')->one();
$chapter = Entry::find()->section('guidesForTeams')->slug('fixture-chapter-one')->one();
if (!$live || !$chapter) {
    throw new RuntimeException('Fixture entries not found. Run scripts/seed-fixtures.php first.');
}

$guideType = null;
foreach ($section->getEntryTypes() as $t) {
    if ($t->handle === 'guide') {
        $guideType = $t;
    }
}
$new = new Entry();
$new->sectionId = $section->id;
$new->typeId = $guideType->id;

$volume = Craft::$app->getVolumes()->getVolumeByHandle('guideImages');
$rootFolder = Craft::$app->getAssets()->getRootFolderByVolumeId($volume->id);

$rows = [];
// Each check: [description, user-key, closure => bool, expected]
$check = function (string $what, string $who, callable $fn, bool $expected) use (&$rows): void {
    $actual = (bool)$fn();
    $rows[] = ['what' => $what, 'who' => $who, 'expected' => $expected, 'actual' => $actual, 'pass' => $actual === $expected];
};
$both = fn(string $what, callable $fnFor, bool $d, bool $p) => [
    $check($what, 'drafter', fn() => $fnFor($drafter), $d),
    $check($what, 'publisher', fn() => $fnFor($publisher), $p),
];

$created = [];
try {
    // Drafts created through Craft's drafts service, one by each user, on the live guide.
    $drafterDraft = $drafts->createDraft($live, $drafter->id, 'matrix: drafter draft');
    $publisherDraft = $drafts->createDraft($live, $publisher->id, 'matrix: publisher draft');
    $created = [$drafterDraft, $publisherDraft];

    // --- Control panel and live content
    $both('access the control panel', fn($u) => $u->can('accessCp'), true, true);
    $both('view the live guide', fn($u) => Authorization::allows($u, 'view', $live), true, true);
    $both('view a live chapter', fn($u) => Authorization::allows($u, 'view', $chapter), true, true);
    $both('save (change live) the live guide', fn($u) => Authorization::allows($u, 'save', $live), false, true);
    $both('save (change live) a live chapter', fn($u) => Authorization::allows($u, 'save', $chapter), false, true);
    $both('delete the live guide', fn($u) => Authorization::allows($u, 'delete', $live), false, true);
    $both('create a new guide entry', fn($u) => Authorization::allows($u, 'save', $new), false, true);
    $both('duplicate the live guide', fn($u) => Authorization::allows($u, 'duplicate', $live), false, true);

    // --- Drafts
    $both('create a draft of the live guide', fn($u) => Authorization::allows($u, 'createDrafts', $live), true, true);
    $own = fn(User $u) => $u->id === $drafter->id ? $drafterDraft : $publisherDraft;
    $peer = fn(User $u) => $u->id === $drafter->id ? $publisherDraft : $drafterDraft;
    $both('view own draft', fn($u) => Authorization::allows($u, 'view', $own($u)), true, true);
    $both('save own draft', fn($u) => Authorization::allows($u, 'save', $own($u)), true, true);
    $both('delete own draft', fn($u) => Authorization::allows($u, 'delete', $own($u)), true, true);
    $both('apply own draft (save + saveCanonical)', fn($u) => Authorization::allows($u, 'save', $own($u)) && Authorization::allows($u, 'saveCanonical', $own($u)), false, true);
    $both("view someone else's draft", fn($u) => Authorization::allows($u, 'view', $peer($u)), false, true);
    $both("save someone else's draft", fn($u) => Authorization::allows($u, 'save', $peer($u)), false, true);
    $both("delete someone else's draft", fn($u) => Authorization::allows($u, 'delete', $peer($u)), false, true);
    $both("apply someone else's draft (save + saveCanonical)", fn($u) => Authorization::allows($u, 'save', $peer($u)) && Authorization::allows($u, 'saveCanonical', $peer($u)), false, true);

    // --- Assets (volume "Guide images")
    $both('view the Guide images folder', fn($u) => Authorization::allows($u, 'viewContents', $rootFolder), true, true);
    $both('upload an asset to Guide images', fn($u) => Authorization::allows($u, 'uploadAsset', $rootFolder), true, true);
    $both('create a sub-folder', fn($u) => Authorization::allows($u, 'createFolder', $rootFolder), false, false);
    $both('delete a folder', fn($u) => Authorization::allows($u, 'deleteFolder', $rootFolder), false, false);
    $both('delete assets', fn($u) => $u->can("deleteAssets:{$volume->uid}"), false, false);
    $both("save assets uploaded by others", fn($u) => $u->can("savePeerAssets:{$volume->uid}"), false, false);

    // --- Nothing privileged leaks in
    $both('assign user permissions (admin-type power)', fn($u) => $u->can('assignUserPermissions'), false, false);
    $both('view the user list', fn($u) => $u->can('viewUsers'), false, false);
    $both('edit the Guides for Teams index (single section)', fn($u) => $u->can('saveEntries:' . Craft::$app->getEntries()->getSectionByHandle('guidesForTeamsIndex')->uid), false, false);
    $both('is an admin', fn($u) => (bool)$u->admin, false, false);
} finally {
    foreach ($created as $d) {
        $elements->deleteElement($d, true);   // hard-delete the temporary drafts
    }
}

$failed = array_values(array_filter($rows, fn($r) => !$r['pass']));
return json_encode(['total' => count($rows), 'passed' => count($rows) - count($failed), 'failed' => $failed, 'rows' => $rows]);
