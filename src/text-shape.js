      /* TODO

* convert to UTF-32
 * call fribidi_get_bidi_types
 * call fribidi_get_par_embedding_levels
 * call fribidi_get_joining_types
 * call fribidi_join_arabic
 * call fribidi_shape
 * split result into lines, for each line call fribidi_reorder_line, combine resulting lines back to paragraph
 * call fribidi_remove_bidi_marks
 * convert result to needed encoding (UTF-8 in my case)
 * use result for display

> I suppose that "off" parameter of fribidi_reorder_line() is equal to size of all previous lines (with line
breaks) in paragraph. Is it correct?
Almost.  There's no line breaks involved.  It's the start index of the line in
the original paragraph text.
      */

var createFontHandle = Module.cwrap( 'createFontHandle', 'number', ['number', 'number', 'number'] );
var destroyFontHandle = Module.cwrap( 'destroyFontHandle', '', ['number'] );
var loadText = Module.cwrap( 'read_text', '', ['number', 'string', 'number', 'number', 'string'] );
var loadGlyphFromIndex = Module.cwrap( 'read_glyph', '', ['number', 'number'] );
var getNumSegments = Module.cwrap( 'getNumSegments', 'number', [] );
var getGlyphSegments = Module.cwrap( 'getGlyphSegments', 'number', [] );
var getNumGlyphs = Module.cwrap( 'getNumGlyphs', 'number', [] );
var getShapeGlyphs = Module.cwrap( 'getShapeGlyphs', 'number', [] );
var getUnitsPerEM = Module.cwrap( 'getUnitsPerEM', 'number', ['number'] ); // font ref

// ( str, dir ) => str
var bidiReorderFast = Module.cwrap( 'bidi_reorder_fast', 'string', ['string', 'number'] );
var bidiReorderAndStore = Module.cwrap( 'bidi_reorder_and_store', 'string', ['string', 'number'] );

// stored info from bidi_reorder_and_store
var getLogicalToVisual = Module.cwrap( 'getLogicalToVisual', 'number', ['number'] ); // ret pointer
var getVisualToLogical = Module.cwrap( 'getVisualToLogical', 'number', ['number'] ); // ret pointer
var getEmbeddingLevels = Module.cwrap( 'getEmbeddingLevels', 'number', ['number'] ); // ret pointer
var getUnicodeSize = Module.cwrap( 'getUnicodeSize', 'number', ['number'] );

// codepoint (uint32 equivalent) to hb_script_t (Script.XXX)
var getScript = Module.cwrap( 'getScript', 'number', ['number'] );

var Direction = {
  LTR: Module.cwrap( 'getDirectionLTR', 'number', [] )(),
  RTL: Module.cwrap( 'getDirectionRTL', 'number', [] )(),
  TTB: Module.cwrap( 'getDirectionTTB', 'number', [] )(),
  BTT: Module.cwrap( 'getDirectionBTT', 'number', [] )()
};

var Script = {
  COMMON: Module.cwrap( 'getScriptCOMMON', 'number', [] )(),
  INHERITED: Module.cwrap( 'getScriptINHERITED', 'number', [] )(),
  UNKNOWN: Module.cwrap( 'getScriptUNKNOWN', 'number', [] )(),
  ARABIC: Module.cwrap( 'getScriptARABIC', 'number', [] )(),
  ARMENIAN: Module.cwrap( 'getScriptARMENIAN', 'number', [] )(),
  BENGALI: Module.cwrap( 'getScriptBENGALI', 'number', [] )(),
  CYRILLIC: Module.cwrap( 'getScriptCYRILLIC', 'number', [] )(),
  DEVANAGARI: Module.cwrap( 'getScriptDEVANAGARI', 'number', [] )(),
  GEORGIAN: Module.cwrap( 'getScriptGEORGIAN', 'number', [] )(),
  GREEK: Module.cwrap( 'getScriptGREEK', 'number', [] )(),
  GUJARATI: Module.cwrap( 'getScriptGUJARATI', 'number', [] )(),
  GURMUKHI: Module.cwrap( 'getScriptGURMUKHI', 'number', [] )(),
  HANGUL: Module.cwrap( 'getScriptHANGUL', 'number', [] )(),
  HAN: Module.cwrap( 'getScriptHAN', 'number', [] )(),
  HEBREW: Module.cwrap( 'getScriptHEBREW', 'number', [] )(),
  HIRAGANA: Module.cwrap( 'getScriptHIRAGANA', 'number', [] )(),
  KANNADA: Module.cwrap( 'getScriptKANNADA', 'number', [] )(),
  KATAKANA: Module.cwrap( 'getScriptKATAKANA', 'number', [] )(),
  LAO: Module.cwrap( 'getScriptLAO', 'number', [] )(),
  LATIN: Module.cwrap( 'getScriptLATIN', 'number', [] )(),
  MALAYALAM: Module.cwrap( 'getScriptMALAYALAM', 'number', [] )(),
  ORIYA: Module.cwrap( 'getScriptORIYA', 'number', [] )(),
  TAMIL: Module.cwrap( 'getScriptTAMIL', 'number', [] )(),
  TELUGU: Module.cwrap( 'getScriptTELUGU', 'number', [] )(),
  THAI: Module.cwrap( 'getScriptTHAI', 'number', [] )(),
  TIBETAN: Module.cwrap( 'getScriptTIBETAN', 'number', [] )(),
  BOPOMOFO: Module.cwrap( 'getScriptBOPOMOFO', 'number', [] )(),
  BRAILLE: Module.cwrap( 'getScriptBRAILLE', 'number', [] )(),
  CANADIAN_SYLLABICS: Module.cwrap( 'getScriptCANADIAN_SYLLABICS', 'number', [] )(),
  CHEROKEE: Module.cwrap( 'getScriptCHEROKEE', 'number', [] )(),
  ETHIOPIC: Module.cwrap( 'getScriptETHIOPIC', 'number', [] )(),
  KHMER: Module.cwrap( 'getScriptKHMER', 'number', [] )(),
  MONGOLIAN: Module.cwrap( 'getScriptMONGOLIAN', 'number', [] )(),
  MYANMAR: Module.cwrap( 'getScriptMYANMAR', 'number', [] )(),
  OGHAM: Module.cwrap( 'getScriptOGHAM', 'number', [] )(),
  RUNIC: Module.cwrap( 'getScriptRUNIC', 'number', [] )(),
  SINHALA: Module.cwrap( 'getScriptSINHALA', 'number', [] )(),
  SYRIAC: Module.cwrap( 'getScriptSYRIAC', 'number', [] )(),
  THAANA: Module.cwrap( 'getScriptTHAANA', 'number', [] )(),
  YI: Module.cwrap( 'getScriptYI', 'number', [] )(),
  DESERET: Module.cwrap( 'getScriptDESERET', 'number', [] )(),
  GOTHIC: Module.cwrap( 'getScriptGOTHIC', 'number', [] )(),
  OLD_ITALIC: Module.cwrap( 'getScriptOLD_ITALIC', 'number', [] )(),
  BUHID: Module.cwrap( 'getScriptBUHID', 'number', [] )(),
  HANUNOO: Module.cwrap( 'getScriptHANUNOO', 'number', [] )(),
  TAGALOG: Module.cwrap( 'getScriptTAGALOG', 'number', [] )(),
  TAGBANWA: Module.cwrap( 'getScriptTAGBANWA', 'number', [] )(),
  CYPRIOT: Module.cwrap( 'getScriptCYPRIOT', 'number', [] )(),
  LIMBU: Module.cwrap( 'getScriptLIMBU', 'number', [] )(),
  LINEAR_B: Module.cwrap( 'getScriptLINEAR_B', 'number', [] )(),
  OSMANYA: Module.cwrap( 'getScriptOSMANYA', 'number', [] )(),
  SHAVIAN: Module.cwrap( 'getScriptSHAVIAN', 'number', [] )(),
  TAI_LE: Module.cwrap( 'getScriptTAI_LE', 'number', [] )(),
  UGARITIC: Module.cwrap( 'getScriptUGARITIC', 'number', [] )(),
  BUGINESE: Module.cwrap( 'getScriptBUGINESE', 'number', [] )(),
  COPTIC: Module.cwrap( 'getScriptCOPTIC', 'number', [] )(),
  GLAGOLITIC: Module.cwrap( 'getScriptGLAGOLITIC', 'number', [] )(),
  KHAROSHTHI: Module.cwrap( 'getScriptKHAROSHTHI', 'number', [] )(),
  NEW_TAI_LUE: Module.cwrap( 'getScriptNEW_TAI_LUE', 'number', [] )(),
  OLD_PERSIAN: Module.cwrap( 'getScriptOLD_PERSIAN', 'number', [] )(),
  SYLOTI_NAGRI: Module.cwrap( 'getScriptSYLOTI_NAGRI', 'number', [] )(),
  TIFINAGH: Module.cwrap( 'getScriptTIFINAGH', 'number', [] )(),
  BALINESE: Module.cwrap( 'getScriptBALINESE', 'number', [] )(),
  CUNEIFORM: Module.cwrap( 'getScriptCUNEIFORM', 'number', [] )(),
  NKO: Module.cwrap( 'getScriptNKO', 'number', [] )(),
  PHAGS_PA: Module.cwrap( 'getScriptPHAGS_PA', 'number', [] )(),
  PHOENICIAN: Module.cwrap( 'getScriptPHOENICIAN', 'number', [] )(),
  CARIAN: Module.cwrap( 'getScriptCARIAN', 'number', [] )(),
  CHAM: Module.cwrap( 'getScriptCHAM', 'number', [] )(),
  KAYAH_LI: Module.cwrap( 'getScriptKAYAH_LI', 'number', [] )(),
  LEPCHA: Module.cwrap( 'getScriptLEPCHA', 'number', [] )(),
  LYCIAN: Module.cwrap( 'getScriptLYCIAN', 'number', [] )(),
  LYDIAN: Module.cwrap( 'getScriptLYDIAN', 'number', [] )(),
  OL_CHIKI: Module.cwrap( 'getScriptOL_CHIKI', 'number', [] )(),
  REJANG: Module.cwrap( 'getScriptREJANG', 'number', [] )(),
  SAURASHTRA: Module.cwrap( 'getScriptSAURASHTRA', 'number', [] )(),
  SUNDANESE: Module.cwrap( 'getScriptSUNDANESE', 'number', [] )(),
  VAI: Module.cwrap( 'getScriptVAI', 'number', [] )(),
  AVESTAN: Module.cwrap( 'getScriptAVESTAN', 'number', [] )(),
  BAMUM: Module.cwrap( 'getScriptBAMUM', 'number', [] )(),
  EGYPTIAN_HIEROGLYPHS: Module.cwrap( 'getScriptEGYPTIAN_HIEROGLYPHS', 'number', [] )(),
  IMPERIAL_ARAMAIC: Module.cwrap( 'getScriptIMPERIAL_ARAMAIC', 'number', [] )(),
  INSCRIPTIONAL_PAHLAVI: Module.cwrap( 'getScriptINSCRIPTIONAL_PAHLAVI', 'number', [] )(),
  INSCRIPTIONAL_PARTHIAN: Module.cwrap( 'getScriptINSCRIPTIONAL_PARTHIAN', 'number', [] )(),
  JAVANESE: Module.cwrap( 'getScriptJAVANESE', 'number', [] )(),
  KAITHI: Module.cwrap( 'getScriptKAITHI', 'number', [] )(),
  LISU: Module.cwrap( 'getScriptLISU', 'number', [] )(),
  MEETEI_MAYEK: Module.cwrap( 'getScriptMEETEI_MAYEK', 'number', [] )(),
  OLD_SOUTH_ARABIAN: Module.cwrap( 'getScriptOLD_SOUTH_ARABIAN', 'number', [] )(),
  OLD_TURKIC: Module.cwrap( 'getScriptOLD_TURKIC', 'number', [] )(),
  SAMARITAN: Module.cwrap( 'getScriptSAMARITAN', 'number', [] )(),
  TAI_THAM: Module.cwrap( 'getScriptTAI_THAM', 'number', [] )(),
  TAI_VIET: Module.cwrap( 'getScriptTAI_VIET', 'number', [] )(),
  BATAK: Module.cwrap( 'getScriptBATAK', 'number', [] )(),
  BRAHMI: Module.cwrap( 'getScriptBRAHMI', 'number', [] )(),
  MANDAIC: Module.cwrap( 'getScriptMANDAIC', 'number', [] )(),
  CHAKMA: Module.cwrap( 'getScriptCHAKMA', 'number', [] )(),
  MEROITIC_CURSIVE: Module.cwrap( 'getScriptMEROITIC_CURSIVE', 'number', [] )(),
  MEROITIC_HIEROGLYPHS: Module.cwrap( 'getScriptMEROITIC_HIEROGLYPHS', 'number', [] )(),
  MIAO: Module.cwrap( 'getScriptMIAO', 'number', [] )(),
  SHARADA: Module.cwrap( 'getScriptSHARADA', 'number', [] )(),
  SORA_SOMPENG: Module.cwrap( 'getScriptSORA_SOMPENG', 'number', [] )(),
  TAKRI: Module.cwrap( 'getScriptTAKRI', 'number', [] )()
};

function read8array( pointer, size ) {
  var result8 = new Uint8Array( size );
  result8.set( Module.HEAPU8.subarray( pointer, pointer + size ) );
  return result8;
}

function read32array( pointer, size ) {
  var result8 = read8array( pointer, size * 4 );
  return new Uint32Array( result8.buffer );
}

// codepoints is an array of numbers, or Uint32Array
// NOTE: seems to do a bit of shaping also?
function reorderUnicode( codepoints, hb_dir ) {
  var size = codepoints.length;
  // TODO: refactor write!
  var typedCodepoints = new Uint32Array( codepoints );
  var bufferPointer = Module._malloc( size * typedCodepoints.BYTES_PER_ELEMENT );
  Module.HEAPU8.set( new Uint8Array( typedCodepoints.buffer ), bufferPointer );

  var resultPointer = Module.ccall( 'bidi_reorder_unicode_and_store', 'number', ['number','number','number'], [ bufferPointer, size, hb_dir ] );
  var resultCodepoints = read32array( resultPointer, size );
  var logicalToVisualPointer = Module.ccall( 'getLogicalToVisual', 'number', [], [] ); // ints
  var visualToLogicalPointer = Module.ccall( 'getVisualToLogical', 'number', [], [] ); // ints
  var embeddingLevelPointer = Module.ccall( 'getEmbeddingLevels', 'number', [], [] ); // chars

  var logicalToVisual = read32array( logicalToVisualPointer, size );
  var visualToLogical = read32array( visualToLogicalPointer, size );
  var embeddingLevel = read8array( embeddingLevelPointer, size );

  Module._free( bufferPointer );
  Module._free( resultPointer );
  Module._free( logicalToVisualPointer );
  Module._free( visualToLogicalPointer );
  Module._free( embeddingLevelPointer );

  return {
    codepoints: resultCodepoints,
    logicalToVisual: logicalToVisual,
    visualToLogical: visualToLogical,
    embeddingLevel: embeddingLevel
  };
}

function reorder( string, hb_dir ) {
  var codepoints = punycode.ucs2.decode( string );
  var reordering = reorderUnicode( codepoints, hb_dir );
  return {
    beforeString: string,
    afterString: punycode.ucs2.encode( reordering.codepoints ),
    beforeCodepoints: codepoints,
    afterCodepoints: reordering.codepoints,
    logicalToVisual: reordering.logicalToVisual,
    visualToLogical: reordering.visualToLogical,
    embeddingLevel: reordering.embeddingLevel
  };
}

/**
 * @param {UInt8Array} fontDataArray
 * @param {number} index - Index of the font in the file (almost always 0)
 */
function createUInt8FontHandle( fontDataArray, index ) {
  // store our data directly on the heap (not the stack as it would be if passed as 'array')
  var size = fontDataArray.length;
  var bufferPointer = Module._malloc( size * fontDataArray.BYTES_PER_ELEMENT );
  Module.HEAPU8.set( fontDataArray, bufferPointer );
  return createFontHandle( bufferPointer, size, index );
}

// gives font handle
function loadWebFontFromURL( url, index, callback ) {
  var req = new XMLHttpRequest();
  req.open( 'GET', url, true );
  req.responseType = 'arraybuffer';

  req.onload = function( evt ) {
    var data = new Int8Array( req.response ); // response is an arraybuffer
    callback( createUInt8FontHandle( data, index ) );
  }

  req.send( null );
}

// Google web font api doesn't include CORS here
function loadWebFontFromCSSURL( cssUrl, index, callback ) {
  var req = new XMLHttpRequest();
  req.open( 'GET', cssUrl, true );

  req.onload = function( evt ) {
    var css = req.responseText;

    // pick the first URL for now
    loadWebFontFromURL( css.match( /url\(([^\)]+\.(woff|ttf|otf))\)/ )[1], index, callback );
  }

  req.send( null );
}

function createBase64FontHandle( base64, index ) {
  index = index || 0;

  var bytes = atob( base64 );
  var byteNums = new Array( bytes.length );
  for ( var i = 0; i < bytes.length; i++) {
      byteNums[i] = bytes.charCodeAt( i );
  }
  var fontDataArray = new Int8Array( byteNums );

  return createUInt8FontHandle( fontDataArray, index );
}

var segmentSize = 7 * 8; // the doubles are aligned, so it pads around the char
var referenceSize = 5 * 4; // 5 32-bit values

function readSegment( offset, shape, unitsPerEM ) {
  // TODO: will optimizations change how the struct is packed?
  var type = Module.getValue( offset + 8 * 0, 'i8' );
  var x    = Module.getValue( offset + 8 * 1, 'double' ) / unitsPerEM;
  var y    = Module.getValue( offset + 8 * 2, 'double' ) / unitsPerEM;
  var x1   = Module.getValue( offset + 8 * 3, 'double' ) / unitsPerEM;
  var y1   = Module.getValue( offset + 8 * 4, 'double' ) / unitsPerEM;
  var x2   = Module.getValue( offset + 8 * 5, 'double' ) / unitsPerEM;
  var y2   = Module.getValue( offset + 8 * 6, 'double' ) / unitsPerEM;

  switch( type ) {
    case 0:
      return shape.moveTo( x, y );
    case 1:
      return shape.lineTo( x, y );
    case 2:
      return shape.quadraticCurveTo( x1, y1, x, y );
    case 3:
      return shape.cubicCurveTo( x1, y1, x2, y2, x, y );
    case 4:
      return shape.close();
    default:
      return shape;
  }
}

// @returns {Shape}
function readGlyph( unitsPerEM ) {
  var numSegments = getNumSegments();
  var offset = getGlyphSegments();

  var shape = new kite.Shape();
  for ( var i = 0; i < numSegments; i++ ) {
    readSegment( offset + i * segmentSize, shape, unitsPerEM );
  }

  return shape;
}

// returns {Shape}
function shapeFromGlyphIndex( font, index ) {
  loadGlyphFromIndex( font, index );
  return readGlyph( getUnitsPerEM( font ) );
}

function shapeText( font, text, direction, script, language ) {
  loadText( font, text, direction, script, language );
  var numGlyphs = getNumGlyphs();
  var offset = getShapeGlyphs();
  var unitsPerEM = getUnitsPerEM( font );

  var glyphs = [];

  var x = 0;
  var y = 0;
  for ( var i = 0; i < numGlyphs; i++ ) {
    var index     = Module.getValue( offset + 4 * 0, 'i32' );
    var x_offset  = Module.getValue( offset + 4 * 1, 'i32' ) / unitsPerEM;
    var y_offset  = Module.getValue( offset + 4 * 2, 'i32' ) / unitsPerEM;
    var x_advance = Module.getValue( offset + 4 * 3, 'i32' ) / unitsPerEM;
    var y_advance = Module.getValue( offset + 4 * 4, 'i32' ) / unitsPerEM;
    offset += referenceSize;

    glyphs.push( {
      font: font,
      index: index,
      x: x + x_offset,
      y: y + y_offset
    } );

    x += x_advance;
    y += y_advance;
  }

  return {
    glyphs: glyphs,
    x_advance: x,
    y_advance: y
  };
}

// scriptData should have scriptData[Script.XXX] = { font: ..., language: ... }
function shapeRuns( text, direction, scriptData ) {
  var codepoints = punycode.ucs2.decode( text );
  var reordering = reorderUnicode( codepoints, direction );

  // split into runs based on embed level and script
  var runs = [];
  var currentCodepoints = [];
  var lastEmbedLevel = -100;
  var lastScript = -1;
  var first = true;
  for ( var i = 0; i < codepoints.length; i++ ) {
    var j = reordering.visualToLogical[i];
    var codepoint = codepoints[j];
    var embedLevel = reordering.embeddingLevel[j];
    var script = getScript( codepoint );
    if ( !scriptData[script] ) {
      script = -1; // e.g. "lack of specific script needed" for now
    }

    if ( !first && ( lastEmbedLevel !== embedLevel || lastScript !== script ) ) {
      runs.push( currentCodepoints );
      currentCodepoints = [];
    }
    lastEmbedLevel = embedLevel;
    lastScript = script;
    first = false;

    currentCodepoints.push( codepoint );
  }
  if ( currentCodepoints.length ) {
    runs.push( currentCodepoints );
  }

  var shapedText = {
    glyphs: [],
    x_advance: 0,
    y_advance: 0
  };

  (function(){
    for ( var k = 0; k < runs.length; k++ ) {
      var run = runs[k];

      var script = getScript( run[0] );
      var font = scriptData[script] ? scriptData[script].font : scriptData['default'].font;
      var language = scriptData[script] ? scriptData[script].language : scriptData['default'].language;
      if ( !scriptData[script] ) {
        script = scriptData['default'].script;
      }
      // Yes, it shows LTR hardcoded, since we already reordered codepoints above
      var newShapedText = shapeText( font, punycode.ucs2.encode( run ), Direction.LTR, script, language );

      for ( var l = 0; l < newShapedText.glyphs.length; l++ ) {
        var glyph = newShapedText.glyphs[l];
        glyph.x += shapedText.x_advance;
        glyph.y += shapedText.y_advance;
        shapedText.glyphs.push( glyph );
      }
      shapedText.x_advance += newShapedText.x_advance;
      shapedText.y_advance += newShapedText.y_advance;
    }
  })();

  return shapedText;
}
