
window.shaping = {
  shapeText: shapeText, // shapeText( font, text, direction, script, language )
  shapeRuns: shapeRuns, // shapeRuns( text, direction, scriptData )
  getGlyph: shapeFromGlyphIndex, // getGlyph( font, index )
  reorderUnicode: reorderUnicode, // reorderUnicode( codepoints, direction )
  createBase64FontHandle: createBase64FontHandle,
  createUInt8FontHandle: createUInt8FontHandle,
  destroyFontHandle: destroyFontHandle,
  getScript: getScript, // getScript( codepoint )
  Script: Script,
  Direction: Direction
};
