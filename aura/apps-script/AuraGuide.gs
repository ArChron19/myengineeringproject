/**
 * Aura guide for selectNsolve (Google Sheets add-on). Add this file and AuraGuide.html to the add-on project.
 * Aura appears as a floating, draggable dialog (head + live captions) and walks the user through a tour.
 * Tours: edit aura/tours/<name>.json on the aura branch of ArChron19/myengineeringproject; the site serves them at
 * https://myengineeringproject.com/aura/tours/<name>.json within about 5 minutes (no add-on redeploy).
 *
 * Wire it into your existing onOpen menu, e.g.:
 *   SpreadsheetApp.getUi().createAddonMenu()
 *     .addItem('Solve', 'yourExistingSolveFunction')
 *     .addItem('Guided tour with Aura', 'showAuraGuide')
 *     .addToUi();
 *
 * Scopes: uses only SpreadsheetApp on the open spreadsheet and HtmlService (works with @OnlyCurrentDoc).
 */

/** Opens Aura as a floating dialog. */
function showAuraGuide(tourName) {
  var t = HtmlService.createTemplateFromFile('AuraGuide');
  t.tour = tourName || 'features-basic-plus';
  var html = t.evaluate().setWidth(300).setHeight(430).setSandboxMode(HtmlService.SandboxMode.IFRAME);
  SpreadsheetApp.getUi().showModelessDialog(html, 'Aura · selectNsolve guide');
}

/** Demo content the tour writes into the sheet (step "run": "auraDemoInsert"). */
function auraDemoInsert(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (name === 'quickstart') {
    var sh = ss.getActiveSheet();
    sh.getRange('A1:A5').setValues([['Free fall (Aura demo)'], ['g = 9.81'], ['h = 50'], ['t = 1 > 0 < 10'], ['h = 0.5 * g * t^2 | 0.001']]);
    sh.getRange('A1').setFontWeight('bold');
    sh.setActiveRange(sh.getRange('A2:A5'));
    return 'ok';
  }
  if (name === 'multitab') {
    var a = ss.getSheetByName('Pipe (Aura demo)') || ss.insertSheet('Pipe (Aura demo)');
    a.getRange('A1:A4').setValues([['Pipe flow inputs'], ['D = 0.1'], ['Re = 100000'], ['ε = 0.000045']]);
    var b = ss.getSheetByName('Notes (Aura demo)') || ss.insertSheet('Notes (Aura demo)');
    b.getRange('A1:A3').setValues([['Hidden working notes'], ['f = 0.02 > 0.008 < 0.1'], ['1/f^0.5 = -2 * LOG10(ε/(3.7*D) + 2.51/(Re*f^0.5)) | 0.001']]);
    b.hideSheet();
    ss.setActiveSheet(a);
    return 'ok';
  }
  return 'unknown demo';
}

/** Selects a range on the active sheet (step "run": "auraSelect", "args": ["A2:A5"]). */
function auraSelect(a1) {
  var sh = SpreadsheetApp.getActiveSheet();
  sh.setActiveRange(sh.getRange(a1));
  return 'ok';
}

/** Shows a tab by name, unhiding it if needed (step "run": "auraShowTab"). */
function auraShowTab(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (sh) { if (sh.isSheetHidden()) sh.showSheet(); SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sh); }
  return sh ? 'ok' : 'no such tab';
}
