      /* TODO
          display:
            (using Canvas only)
            logical,visual, with embedding levels and arrows between?
            highlight based on bidi_type
      */

scenery.Util.polyfillRequestAnimationFrame();

var glyphPaths = {}; // index => scenery.Path

// @returns {scenery.Path}
function getGlyphPath( font, index ) {
  var key = font + '-' + index;
  var path = glyphPaths[key];
  if ( !path ) {
    path = glyphPaths[key] = new scenery.Path( shaping.getGlyph( font, index ), { fill: 'black' } );
  }
  return path;
}

// scriptData should have scriptData[shaping.Script.XXX] = { font: ..., language: ... }
function createTextNode( text, direction, scriptData ) {
  var shapedText = shaping.shapeRuns( text, direction, scriptData );

  var container = new scenery.Node();
  for ( var m = 0; m < shapedText.glyphs.length; m++ ) {
    var glyph = shapedText.glyphs[m];
    var path = getGlyphPath( glyph.font, glyph.index );
    container.addChild( new scenery.Node( {
      x: glyph.x,
      y: glyph.y,
      children: [path]
    } ) );
  }

  return container;
}

var $main = $( '#scene' );
var scene = new scenery.Scene( $main );
//scene.initializeFullscreenEvents();
// scene.resizeOnWindowResize();

var lastTime = 0;
(function step(){
  window.requestAnimationFrame( step, $main[0] );
  var now = Date.now();
  var timeElapsed = now - lastTime;
  lastTime = now;

  scene.updateScene();
})();

function Test( scriptData, direction, inputId, offset, parentNode ) {
  this.scriptData = scriptData;
  this.direction = direction;
  this.textBox = document.getElementById( inputId );
  this.offset = offset;
  this.parentNode = parentNode;
  this.textNode = null;

  var test = this;

  this.textBox.addEventListener( 'input', this.updateText.bind( this ) );
  document.getElementById( 'ltrBox' ).addEventListener( 'click', function() {
    test.direction = shaping.Direction.LTR;
    test.textBox.dir = 'ltr';
    test.updateText();
  } );
  document.getElementById( 'rtlBox' ).addEventListener( 'click', function() {
    test.direction = shaping.Direction.RTL;
    test.textBox.dir = 'rtl';
    test.updateText();
  } );
  document.getElementById( 'canvasBox' ).addEventListener( 'click', function() {
    a.renderer = 'canvas';
    scene.updateScene();
  } );
  document.getElementById( 'svgBox' ).addEventListener( 'click', function() {
    a.renderer = 'svg';
    scene.updateScene();
  } );
  scene.addEventListener( 'resize', this.updateText.bind( this ) );
  this.updateText();
}
Test.prototype = {
  constructor: Test,

  updateText: function() {
    // TODO: don't mix this!
    // var unitScale = getUnitsPerEM( this.scriptData['default'].font );

    var text = this.textBox.value ? this.textBox.value : '(blank)';
    if ( this.textNode ) {
      this.parentNode.removeChild( this.textNode );
    }
    this.textNode = createTextNode( text, this.direction, this.scriptData );
    this.textNode.scale( 40 );
    this.parentNode.addChild( this.textNode );
    if ( this.direction === shaping.Direction.RTL ) {
      this.textNode.right = scene.sceneBounds.width - 10;
    } else {
      this.textNode.left = 10;
    }
    this.textNode.y = this.offset;

    function createDOMCodepoint( codepoint, optionalEmbeddingLevel ) {
      var div = document.createElement( 'div' );
      div.className = 'codepoint';

      var fourDigits = codepoint.toString( 16 );
      while ( fourDigits.length < 4 ) {
        fourDigits = '0' + fourDigits;
      }
      div.innerHTML = '<div class="display">&#x' + codepoint.toString( 16 ) + ';</div><div class="hex">' + fourDigits.slice( 0, 2 ) + '<br>' + fourDigits.slice( 2, 4 ) + '</div>' + ( optionalEmbeddingLevel !== undefined ? ( '<div class="embedding">' + optionalEmbeddingLevel + '</div>' ) : '' );
      return div;
    }

    var logicalContainer = document.getElementById( 'logical' );
    logicalContainer.innerHTML = '';
    var visualContainer = document.getElementById( 'visual' );
    visualContainer.innerHTML = '';

    var codepoints = punycode.ucs2.decode( text );

    for ( var i = 0; i < codepoints.length; i++ ) {
      logicalContainer.appendChild( createDOMCodepoint( codepoints[i] ) );
    }

    var reordering = shaping.reorderUnicode( codepoints, this.direction );

    for ( var i = 0; i < codepoints.length; i++ ) {
      var j = reordering.visualToLogical[i];
      visualContainer.appendChild( createDOMCodepoint( codepoints[j], reordering.embeddingLevel[j] ) );
    }
  }
}

var testArabicString = "هذه هي بعض النصوص العربي"; // or العربية
var testString = "aew ελληνικά ру́сский 简体字?";
var testChineseString = "這是一些中文";
var testDevanagariString = "द्ध्र्य";

var a = new scenery.Node( { renderer: 'canvas', rendererOptions: { fullResolution: true } } );
a.y = 48;
scene.addChild( a );

var notoSerif = shaping.createBase64FontHandle( notoSerifRegularBase64 );
var notoNaskh = shaping.createBase64FontHandle( notoNaskhArabicRegularBase64 );
var notoHebrew = shaping.createBase64FontHandle( notoSansHebrewRegularBase64 );

var CustomSriptData = {};
CustomSriptData['default'] = {
  font: notoSerif,
  language: 'en',
  script: shaping.Script.LATIN
};
CustomSriptData[shaping.Script.ARABIC] = {
  font: notoNaskh,
  language: 'ar'
};
CustomSriptData[shaping.Script.HEBREW] = {
  font: notoHebrew,
  language: 'iw'
};

var test = new Test( CustomSriptData, shaping.Direction.LTR, 'firstText', 0, a );

// default is script 'default'
function fontUploadSetup( id, script, language ) {
  var fontFileBox = document.getElementById( id );
  fontFileBox.addEventListener( 'change', function( evt ) {
    var file = fontFileBox.files[0];
    if ( !file ) {
      return;
    }

    var reader = new FileReader();
    reader.onload = function( event ) {
      var arrayBuffer = reader.result;
      var fontDataArray = new Int8Array( arrayBuffer );
      if ( CustomSriptData[script] ) {
        if ( CustomSriptData[script].font ) {
          // release old font
          shaping.destroyFontHandle( CustomSriptData[script].font );
          CustomSriptData[script].font = 0;
        }
      } else {
        // initial setup sanity check
        CustomSriptData[script] = {
          language: language
        };
      }
      var font = shaping.createUInt8FontHandle( fontDataArray, 0 ); // 0th index
      CustomSriptData[script].font = font;

      // our new font may be allocated in the same place
      glyphPaths = {};

      test.updateText();
    };

    reader.onerror = function( event ) {
      console.log( 'file read error: ' + event.target.error.code );
    };

    reader.readAsArrayBuffer( file );
  } );
}

fontUploadSetup( 'default-font-file', 'default', 'en' );
fontUploadSetup( 'arabic-font-file', shaping.Script.ARABIC, 'ar' );
fontUploadSetup( 'hebrew-font-file', shaping.Script.HEBREW, 'iw' );
