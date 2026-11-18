<?php
/**
 * Test fixtures for the replica Guides for Teams section (THROWAWAY with the replica).
 *
 * Creates (or removes) a clearly-labelled fixture guide with two chapters, using Craft's own
 * element API. No raw SQL. Used to check the templates, and later to give CI something to render.
 *
 * Run through Craft's `exec` command (it evaluates one expression), so pass the mode via a closure:
 *
 *   ddev craft exec "(function(){ $mode='seed'; return require '/var/www/html/scripts/seed-fixtures.php'; })()"
 *   ddev craft exec "(function(){ $mode='remove'; return require '/var/www/html/scripts/seed-fixtures.php'; })()"
 *
 * Fixture entries all have slugs starting with "fixture-" so they are easy to find and delete.
 */

use craft\elements\Entry;
use craft\elements\User;

$mode = $mode ?? 'seed';
$elements = Craft::$app->getElements();
$entries = Craft::$app->getEntries();

$section = $entries->getSectionByHandle('guidesForTeams');
if (!$section) {
    throw new RuntimeException('Section guidesForTeams not found.');
}

// Remove any existing fixtures first (hard delete) so seeding is repeatable.
$removed = 0;
$existing = Entry::find()->section('guidesForTeams')->slug('fixture-*')->status(null)->drafts(null)->revisions(null)->all();
// Delete deepest first so children go before their parents.
usort($existing, fn($a, $b) => $b->level <=> $a->level);
foreach ($existing as $e) {
    $elements->deleteElement($e, true);
    $removed++;
}
if ($mode === 'remove') {
    return json_encode(['removed' => $removed]);
}

$admin = User::find()->admin()->one();
if (!$admin) {
    throw new RuntimeException('No admin user found to own the fixtures.');
}

$typeByHandle = [];
foreach ($section->getEntryTypes() as $t) {
    $typeByHandle[$t->handle] = $t;
}

$make = function (string $type, string $title, string $slug, array $fields, ?int $parentId = null) use ($section, $typeByHandle, $admin, $elements): Entry {
    $entry = new Entry();
    $entry->sectionId = $section->id;
    $entry->typeId = $typeByHandle[$type]->id;
    $entry->setAuthorId($admin->id);
    $entry->title = $title;
    $entry->slug = $slug;
    $entry->enabled = true;
    if ($parentId) {
        $entry->setParentId($parentId);
    }
    $entry->setFieldValues($fields);
    if (!$elements->saveElement($entry)) {
        throw new RuntimeException("Could not save $slug: " . json_encode($entry->getErrors()));
    }
    return $entry;
};

$guide = $make('guide', 'Fixture guide (delete me)', 'fixture-guide', [
    'guideTagline' => 'A fixture guide used to test the templates.',
    'guideIsNew' => true,
]);

$body1 = '<p>This is the opening paragraph of the first fixture chapter.</p>'
    . '<h3>Assemble a team</h3><p>Some text with a <a href="https://example.com/team">link</a>.</p>'
    . '<h3>Examine foundations</h3><p>More text under a second section heading.</p>'
    . '<h3>Run an audit</h3><p>Closing text under a third section heading.</p>';

$card = fn(string $type, string $title, string $desc, string $url) => [
    'type' => $type,
    'title' => $title,
    'fields' => ['cardDescription' => $desc, 'cardLink' => ['type' => 'url', 'value' => $url]],
];

$make('chapter', 'Fixture chapter one', 'fixture-chapter-one', [
    'chapterSubtitle' => 'The first fixture chapter.',
    'chapterBody' => $body1,
    'chapterResourceCards' => [
        'new1' => $card('strategyCard', 'Strategy: start small', 'A short description of a strategy card.', 'https://example.com/strategy'),
        'new2' => $card('activityCard', 'Activity: map your tools', 'A short description of an activity card.', 'https://example.com/activity'),
        'new3' => $card('artifactCard', 'Artifact: audit template', 'A short description of an artifact card.', 'https://example.com/artifact'),
    ],
], $guide->id);

$make('chapter', 'Fixture chapter two', 'fixture-chapter-two', [
    'chapterSubtitle' => 'The second fixture chapter, with no cards.',
    'chapterBody' => '<p>A second chapter with a single paragraph and no section headings.</p>',
], $guide->id);

return json_encode(['removed' => $removed, 'created' => ['fixture-guide', 'fixture-chapter-one', 'fixture-chapter-two']]);
