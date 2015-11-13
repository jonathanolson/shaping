Shaping.js
==========

Shaping.js is a minimal JavaScript API for text shaping (turning single-line strings and font information into a description of glyph locations and shapes).

NOTE: It's currently very experimental and rough. Use at your own risk!

It uses FreeType/FriBidi/Harfbuzz, so it is able to read in most font formats, and orders the displayed text according to the Unicode Bi-Directional algorithm.

### Example Usage

```js
// load the font's data into memory
var notoSerif = shaping.createBase64FontHandle( notoSerifRegularBase64 );

// shape text with a single script/language/font
var glyphInfo = shaping.shapeText( notoSerif, 'Hello', shaping.Direction.LTR, shaping.Script.LATIN, 'en' );

// use the data to draw the text into a Canvas
var canvas = document.createElement( 'canvas' );
var context = canvas.getContext( '2d' );
context.setTransform( 50, 0, 0, 50, 30, 70 ); // scale it up by the font size (50px)
document.body.appendChild( canvas );
glyphInfo.glyphs.forEach( function( glyph ) {
  // a Kite Shape object.
  var glyphShape = shaping.getGlyph( glyph.font, glyph.index );

  // draw the glyph into the canvas, with the glyph's origin at (glyph.x, glyph.y)
  context.save();
  context.translate( glyph.x, glyph.y );
  context.beginPath();
  glyphShape.writeToContext( context );
  context.fill();
  context.restore();

  glyphShape.getSVGPath(); // Or get the SVG path of the glyph as a string, which can be used with SVG
} );
```

### API

First, you'll want to load a font (or fonts) to use one of the following:
```js
var fontHandle = shaping.createBase64FontHandle( {string} base64, {number} index )
var fontHandle = shaping.createUInt8FontHandle( {UInt8Array} array, {number} index )
```
The first parameter stores the binary data for the font file, and the index specifies which font face (in the file) to use (it's normally 0).
After you are done using a font, its memory usage can be cleared with:
```js
shaping.destroyFontHandle( {fontHandle} font )
```

Then the simplest way to shape text just uses one font, script and language:
```js
shaping.shapeText( {fontHandle} font, {string} text, {shaping.Direction} direction, {shaping.Script} script, {string} language )
```

This will return an object of the format:
```js
{
  glyphs: [
    {
      font: {fontHandle}, // the font used for this particular glyph
      index: {number}, // the index of this glyph within that particular font
      x: {number}, // the x-offset of this glyph's origin from the start of the text
      y: {number} // the y-offset of this glyph's origin from the baseline
    },
    ...
  ],
  x_advance: {number}, // how far to the right this text shifted the "cursor"
  y_advance: {number} // how far down this text shifted the "cursor"
}
```

It's also possible to have Shaping.js detect the script/language, and switch between different fonts depending on the type of script:
```js
shaping.shapeRuns( text, direction, scriptData )
```
Where scriptData is an object storing key-value pairs, where keys are scripts (e.g. shaping.Script.LATIN), and the values
are { font: {fontHandle}, language: {string} }. There can also be a default element, which has an additional script
property. For example:
```js
var scriptData = {};
scriptData.default = {
  font: notoSerif,
  language: 'en',
  script: shaping.Script.LATIN // The default fallback will be rendered with this script
};
scriptData[ shaping.Script.ARABIC ] = {
  font: notoNaskh,
  language: 'ar'
};
scriptData[ shaping.Script.HEBREW ] = {
  font: notoHebrew,
  language: 'iw'
};
```

Then for display or font metrics, Shaping.js provides a Kite Shape for each glyph:
```js
shaping.getGlyph( {fontHandle} font, {number} index )
```

Additionally, there are two more helper functions:
```shaping.getScript( {number} codepoint )``` - Returns the detected shaping.Script for the integer-valued Unicode codepoint.
```shaping.reorderUnicode( {Array.<number>} codepoints, {shaping.Direction} direction )``` - Returns a structure with codepoints and details on the mapping between the reordering.
