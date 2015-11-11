/**
 * C side of the shaping API. Currently in a very rough shape.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ft2build.h>
#include FT_FREETYPE_H
#include <ftoutln.h>

#include <harfbuzz/hb.h>
#include <harfbuzz/hb-ft.h>

#include <fribidi/fribidi.h>

// A positioned glyph referenced in the shaped text.
struct js_glyph_reference {
  unsigned int index;
  long x_offset;
  long y_offset;
  long x_advance;
  long y_advance;
};

// A segment of a glyph's shape.
struct js_glyph_segment {
  unsigned char type; // 0: move, 1: line, 2: quadratic, 3: cubic, 4: close, see below

  // the end-point
  double x;
  double y;

  // first control point
  double x1;
  double y1;

  // second control point if applicable (cubic)
  double x2;
  double y2;
};
const unsigned char JS_GLYPH_TYPE_MOVE = 0;
const unsigned char JS_GLYPH_TYPE_LINE = 1;
const unsigned char JS_GLYPH_TYPE_QUADRATIC = 2;
const unsigned char JS_GLYPH_TYPE_CUBIC = 3;
const unsigned char JS_GLYPH_TYPE_CLOSE = 4;

typedef struct {
  FT_Face face;
  hb_font_t *hb_ft_font;
  hb_face_t *hb_ft_face;
  unsigned char *data;
} font_handle;

hb_unicode_funcs_t *hb_ucdn_get_unicode_funcs (void);

// global freetype library
FT_Library library;

// global segment information for a single glyph, loaded with read_outline
unsigned int num_segments = 0;
struct js_glyph_segment glyph_segments[256]; // hopefully this is an OK limit?

// global glyph information for a single buffer (string)
unsigned int num_glyphs;
struct js_glyph_reference shape_glyphs[1024]; // hopefully this is an OK limit?

hb_unicode_funcs_t *unicode_funcs;

unsigned int getNumSegments() { return num_segments; }
void *getGlyphSegments() { return &glyph_segments; }
unsigned int getNumGlyphs() { return num_glyphs; }
void *getShapeGlyphs() { return &shape_glyphs; }
unsigned short getUnitsPerEM( font_handle *font ) { return font->face->units_per_EM; }
hb_script_t getScript( hb_codepoint_t codepoint ) { return hb_unicode_script( unicode_funcs, codepoint ); }
hb_direction_t getDirectionLTR() { return HB_DIRECTION_LTR; }
hb_direction_t getDirectionRTL() { return HB_DIRECTION_RTL; }
hb_direction_t getDirectionTTB() { return HB_DIRECTION_TTB; }
hb_direction_t getDirectionBTT() { return HB_DIRECTION_BTT; }
hb_script_t getScriptCOMMON() { return HB_SCRIPT_COMMON; }
hb_script_t getScriptINHERITED() { return HB_SCRIPT_INHERITED; }
hb_script_t getScriptUNKNOWN() { return HB_SCRIPT_UNKNOWN; }
hb_script_t getScriptARABIC() { return HB_SCRIPT_ARABIC; }
hb_script_t getScriptARMENIAN() { return HB_SCRIPT_ARMENIAN; }
hb_script_t getScriptBENGALI() { return HB_SCRIPT_BENGALI; }
hb_script_t getScriptCYRILLIC() { return HB_SCRIPT_CYRILLIC; }
hb_script_t getScriptDEVANAGARI() { return HB_SCRIPT_DEVANAGARI; }
hb_script_t getScriptGEORGIAN() { return HB_SCRIPT_GEORGIAN; }
hb_script_t getScriptGREEK() { return HB_SCRIPT_GREEK; }
hb_script_t getScriptGUJARATI() { return HB_SCRIPT_GUJARATI; }
hb_script_t getScriptGURMUKHI() { return HB_SCRIPT_GURMUKHI; }
hb_script_t getScriptHANGUL() { return HB_SCRIPT_HANGUL; }
hb_script_t getScriptHAN() { return HB_SCRIPT_HAN; }
hb_script_t getScriptHEBREW() { return HB_SCRIPT_HEBREW; }
hb_script_t getScriptHIRAGANA() { return HB_SCRIPT_HIRAGANA; }
hb_script_t getScriptKANNADA() { return HB_SCRIPT_KANNADA; }
hb_script_t getScriptKATAKANA() { return HB_SCRIPT_KATAKANA; }
hb_script_t getScriptLAO() { return HB_SCRIPT_LAO; }
hb_script_t getScriptLATIN() { return HB_SCRIPT_LATIN; }
hb_script_t getScriptMALAYALAM() { return HB_SCRIPT_MALAYALAM; }
hb_script_t getScriptORIYA() { return HB_SCRIPT_ORIYA; }
hb_script_t getScriptTAMIL() { return HB_SCRIPT_TAMIL; }
hb_script_t getScriptTELUGU() { return HB_SCRIPT_TELUGU; }
hb_script_t getScriptTHAI() { return HB_SCRIPT_THAI; }
hb_script_t getScriptTIBETAN() { return HB_SCRIPT_TIBETAN; }
hb_script_t getScriptBOPOMOFO() { return HB_SCRIPT_BOPOMOFO; }
hb_script_t getScriptBRAILLE() { return HB_SCRIPT_BRAILLE; }
hb_script_t getScriptCANADIAN_SYLLABICS() { return HB_SCRIPT_CANADIAN_SYLLABICS; }
hb_script_t getScriptCHEROKEE() { return HB_SCRIPT_CHEROKEE; }
hb_script_t getScriptETHIOPIC() { return HB_SCRIPT_ETHIOPIC; }
hb_script_t getScriptKHMER() { return HB_SCRIPT_KHMER; }
hb_script_t getScriptMONGOLIAN() { return HB_SCRIPT_MONGOLIAN; }
hb_script_t getScriptMYANMAR() { return HB_SCRIPT_MYANMAR; }
hb_script_t getScriptOGHAM() { return HB_SCRIPT_OGHAM; }
hb_script_t getScriptRUNIC() { return HB_SCRIPT_RUNIC; }
hb_script_t getScriptSINHALA() { return HB_SCRIPT_SINHALA; }
hb_script_t getScriptSYRIAC() { return HB_SCRIPT_SYRIAC; }
hb_script_t getScriptTHAANA() { return HB_SCRIPT_THAANA; }
hb_script_t getScriptYI() { return HB_SCRIPT_YI; }
hb_script_t getScriptDESERET() { return HB_SCRIPT_DESERET; }
hb_script_t getScriptGOTHIC() { return HB_SCRIPT_GOTHIC; }
hb_script_t getScriptOLD_ITALIC() { return HB_SCRIPT_OLD_ITALIC; }
hb_script_t getScriptBUHID() { return HB_SCRIPT_BUHID; }
hb_script_t getScriptHANUNOO() { return HB_SCRIPT_HANUNOO; }
hb_script_t getScriptTAGALOG() { return HB_SCRIPT_TAGALOG; }
hb_script_t getScriptTAGBANWA() { return HB_SCRIPT_TAGBANWA; }
hb_script_t getScriptCYPRIOT() { return HB_SCRIPT_CYPRIOT; }
hb_script_t getScriptLIMBU() { return HB_SCRIPT_LIMBU; }
hb_script_t getScriptLINEAR_B() { return HB_SCRIPT_LINEAR_B; }
hb_script_t getScriptOSMANYA() { return HB_SCRIPT_OSMANYA; }
hb_script_t getScriptSHAVIAN() { return HB_SCRIPT_SHAVIAN; }
hb_script_t getScriptTAI_LE() { return HB_SCRIPT_TAI_LE; }
hb_script_t getScriptUGARITIC() { return HB_SCRIPT_UGARITIC; }
hb_script_t getScriptBUGINESE() { return HB_SCRIPT_BUGINESE; }
hb_script_t getScriptCOPTIC() { return HB_SCRIPT_COPTIC; }
hb_script_t getScriptGLAGOLITIC() { return HB_SCRIPT_GLAGOLITIC; }
hb_script_t getScriptKHAROSHTHI() { return HB_SCRIPT_KHAROSHTHI; }
hb_script_t getScriptNEW_TAI_LUE() { return HB_SCRIPT_NEW_TAI_LUE; }
hb_script_t getScriptOLD_PERSIAN() { return HB_SCRIPT_OLD_PERSIAN; }
hb_script_t getScriptSYLOTI_NAGRI() { return HB_SCRIPT_SYLOTI_NAGRI; }
hb_script_t getScriptTIFINAGH() { return HB_SCRIPT_TIFINAGH; }
hb_script_t getScriptBALINESE() { return HB_SCRIPT_BALINESE; }
hb_script_t getScriptCUNEIFORM() { return HB_SCRIPT_CUNEIFORM; }
hb_script_t getScriptNKO() { return HB_SCRIPT_NKO; }
hb_script_t getScriptPHAGS_PA() { return HB_SCRIPT_PHAGS_PA; }
hb_script_t getScriptPHOENICIAN() { return HB_SCRIPT_PHOENICIAN; }
hb_script_t getScriptCARIAN() { return HB_SCRIPT_CARIAN; }
hb_script_t getScriptCHAM() { return HB_SCRIPT_CHAM; }
hb_script_t getScriptKAYAH_LI() { return HB_SCRIPT_KAYAH_LI; }
hb_script_t getScriptLEPCHA() { return HB_SCRIPT_LEPCHA; }
hb_script_t getScriptLYCIAN() { return HB_SCRIPT_LYCIAN; }
hb_script_t getScriptLYDIAN() { return HB_SCRIPT_LYDIAN; }
hb_script_t getScriptOL_CHIKI() { return HB_SCRIPT_OL_CHIKI; }
hb_script_t getScriptREJANG() { return HB_SCRIPT_REJANG; }
hb_script_t getScriptSAURASHTRA() { return HB_SCRIPT_SAURASHTRA; }
hb_script_t getScriptSUNDANESE() { return HB_SCRIPT_SUNDANESE; }
hb_script_t getScriptVAI() { return HB_SCRIPT_VAI; }
hb_script_t getScriptAVESTAN() { return HB_SCRIPT_AVESTAN; }
hb_script_t getScriptBAMUM() { return HB_SCRIPT_BAMUM; }
hb_script_t getScriptEGYPTIAN_HIEROGLYPHS() { return HB_SCRIPT_EGYPTIAN_HIEROGLYPHS; }
hb_script_t getScriptIMPERIAL_ARAMAIC() { return HB_SCRIPT_IMPERIAL_ARAMAIC; }
hb_script_t getScriptINSCRIPTIONAL_PAHLAVI() { return HB_SCRIPT_INSCRIPTIONAL_PAHLAVI; }
hb_script_t getScriptINSCRIPTIONAL_PARTHIAN() { return HB_SCRIPT_INSCRIPTIONAL_PARTHIAN; }
hb_script_t getScriptJAVANESE() { return HB_SCRIPT_JAVANESE; }
hb_script_t getScriptKAITHI() { return HB_SCRIPT_KAITHI; }
hb_script_t getScriptLISU() { return HB_SCRIPT_LISU; }
hb_script_t getScriptMEETEI_MAYEK() { return HB_SCRIPT_MEETEI_MAYEK; }
hb_script_t getScriptOLD_SOUTH_ARABIAN() { return HB_SCRIPT_OLD_SOUTH_ARABIAN; }
hb_script_t getScriptOLD_TURKIC() { return HB_SCRIPT_OLD_TURKIC; }
hb_script_t getScriptSAMARITAN() { return HB_SCRIPT_SAMARITAN; }
hb_script_t getScriptTAI_THAM() { return HB_SCRIPT_TAI_THAM; }
hb_script_t getScriptTAI_VIET() { return HB_SCRIPT_TAI_VIET; }
hb_script_t getScriptBATAK() { return HB_SCRIPT_BATAK; }
hb_script_t getScriptBRAHMI() { return HB_SCRIPT_BRAHMI; }
hb_script_t getScriptMANDAIC() { return HB_SCRIPT_MANDAIC; }
hb_script_t getScriptCHAKMA() { return HB_SCRIPT_CHAKMA; }
hb_script_t getScriptMEROITIC_CURSIVE() { return HB_SCRIPT_MEROITIC_CURSIVE; }
hb_script_t getScriptMEROITIC_HIEROGLYPHS() { return HB_SCRIPT_MEROITIC_HIEROGLYPHS; }
hb_script_t getScriptMIAO() { return HB_SCRIPT_MIAO; }
hb_script_t getScriptSHARADA() { return HB_SCRIPT_SHARADA; }
hb_script_t getScriptSORA_SOMPENG() { return HB_SCRIPT_SORA_SOMPENG; }
hb_script_t getScriptTAKRI() { return HB_SCRIPT_TAKRI; }

FriBidiStrIndex *globalLogicalToVisual;
FriBidiStrIndex *globalVisualToLogical;
FriBidiLevel *globalEmbeddingLevels;
int globalUnicodeSize;

FriBidiStrIndex *getLogicalToVisual() { return globalLogicalToVisual; }
FriBidiStrIndex *getVisualToLogical() { return globalVisualToLogical; }
FriBidiLevel *getEmbeddingLevels() { return globalEmbeddingLevels; }
int getUnicodeSize() { return globalUnicodeSize; }

//TODO: refactor
// allocates the resulting char array
char *bidi_reorder( const char *str, hb_direction_t dir, FriBidiStrIndex *logicalToVisual, FriBidiStrIndex *visualToLogical, FriBidiLevel *embeddingLevels, int store ) {
  int size = strlen( str );
  int unicodeSize;

  FriBidiChar *logicalUnicode = alloca( size * 4 * sizeof( FriBidiChar ) );
  FriBidiChar *visualUnicode = alloca( size * 4 * sizeof( FriBidiChar ) );
  char *visualResult = malloc( size * 4 * sizeof( char ) );

  // or ON if we want to auto-detect? (it should tell us, right?)
  FriBidiParType direction = ( dir == HB_DIRECTION_RTL ) ? FRIBIDI_PAR_RTL : FRIBIDI_PAR_LTR;

  unicodeSize = fribidi_charset_to_unicode( FRIBIDI_CHAR_SET_UTF8, str, size, logicalUnicode );
  if ( store ) {
    globalUnicodeSize = unicodeSize;
  }

  // see https://github.com/behdad/fribidi for docs on the l2v, v2l or embedding level list
  fribidi_log2vis( logicalUnicode, unicodeSize, &direction, visualUnicode, logicalToVisual, visualToLogical, embeddingLevels );

  fribidi_unicode_to_charset( FRIBIDI_CHAR_SET_UTF8, visualUnicode, unicodeSize, visualResult );

  return visualResult;
}

char* bidi_reorder_fast( const char *str, hb_direction_t dir ) {
  return bidi_reorder( str, dir, NULL, NULL, NULL, 0 );
}

char* bidi_reorder_and_store( const char *str, hb_direction_t dir ) {
  return bidi_reorder( str, dir, globalLogicalToVisual, globalVisualToLogical, globalEmbeddingLevels, 1 );
}

// allocates result (should be freed)
FriBidiChar *bidi_reorder_unicode_and_store( const FriBidiChar *logicalUnicode, int size, hb_direction_t dir ) {
  globalUnicodeSize = size;
  FriBidiChar *visualUnicode = malloc( size * sizeof( FriBidiChar ) );
  FriBidiParType direction = ( dir == HB_DIRECTION_RTL ) ? FRIBIDI_PAR_RTL : FRIBIDI_PAR_LTR;
  globalLogicalToVisual = malloc( size * sizeof( FriBidiStrIndex ) );
  globalVisualToLogical = malloc( size * sizeof( FriBidiStrIndex ) );
  globalEmbeddingLevels = malloc( size * sizeof( FriBidiLevel ) );
  fribidi_log2vis( logicalUnicode, size, &direction, visualUnicode, globalLogicalToVisual, globalVisualToLogical, globalEmbeddingLevels );
  return visualUnicode;
}

double read_x1 = 0;
double read_y1 = 0;
double read_x2 = 0;
double read_y2 = 0;
int read_n_control_points = 0;

void read_move( double x, double y ) {
  glyph_segments[num_segments].type = JS_GLYPH_TYPE_MOVE;
  glyph_segments[num_segments].x = x;
  glyph_segments[num_segments].y = y;
  num_segments++;
}
void read_line( double x, double y ) {
  glyph_segments[num_segments].type = JS_GLYPH_TYPE_LINE;
  glyph_segments[num_segments].x = x;
  glyph_segments[num_segments].y = y;
  num_segments++;
}
void read_quadratic( double x1, double y1, double x, double y ) {
  glyph_segments[num_segments].type = JS_GLYPH_TYPE_QUADRATIC;
  glyph_segments[num_segments].x1 = x1;
  glyph_segments[num_segments].y1 = y1;
  glyph_segments[num_segments].x = x;
  glyph_segments[num_segments].y = y;
  num_segments++;
}
void read_cubic( double x1, double y1, double x2, double y2, double x, double y ) {
  glyph_segments[num_segments].type = JS_GLYPH_TYPE_CUBIC;
  glyph_segments[num_segments].x1 = x1;
  glyph_segments[num_segments].y1 = y1;
  glyph_segments[num_segments].x2 = x2;
  glyph_segments[num_segments].y2 = y2;
  glyph_segments[num_segments].x = x;
  glyph_segments[num_segments].y = y;
  num_segments++;
}
void read_close() {
  glyph_segments[num_segments].type = JS_GLYPH_TYPE_CLOSE;
  num_segments++;
}

void read_init() {
  num_segments = 0;
}
void read_start( double x, double y, char tag ) {
  read_n_control_points = 0;

  read_move( x, y );
}
void read_point( double x, double y, char tag ) {
//printf( "read_point( %f, %f, %x )\n", x, y, tag );
  char isPointOn = tag & FT_CURVE_TAG_ON;
  //char isPointOn = 1;

  if ( isPointOn ) {
    switch( read_n_control_points ) {
      case 0:
        read_line( x, y );
        break;
      case 1:
        read_quadratic( read_x1, read_y1, x, y );
        break;
      case 2:
        read_cubic( read_x2, read_y2, read_x1, read_y1, x, y );
        break;
      default:
        printf( "Reached %u control points!\n", read_n_control_points );
        assert( 0 ); // bails out for now. probably a better way?
    }
    read_n_control_points = 0;
  } else {
    if ( read_n_control_points == 1 && !( tag & FT_CURVE_TAG_CUBIC ) ) {
      // quadratic two control points. We'll add a synthetic one in-between, keeping the control-point count at 1
      double mid_x = ( read_x1 + x ) / 2;
      double mid_y = ( read_y1 + y ) / 2;
      read_quadratic( read_x1, read_y1, mid_x, mid_y );
      read_x1 = x;
      read_y1 = y;
    } else {
      // shift and increment
      read_x2 = read_x1;
      read_y2 = read_y1;
      read_x1 = x;
      read_y1 = y;
      read_n_control_points++;
    }
  }
}
void read_end() {
  read_close();
}

void read_outline( FT_Outline outline ) {
  // outline:
  // n_contours
  // n_points
  // points {FT_Vector*} with x,y signed long
  // tags {char*} bit0: set means "on curve", otherwise it's a control point. bit1: for ctrl ppoints, set means "cubic bezier", instead of quadratic
  //              bit2: if set, bits 5-7 contain the drop-out mode (can we skip a few points?) see http://www.microsoft.com/typography/otspec/recom.htm
  // contours {short*}, e.g. point start-end pairs [0,contours[0]], [contours[0]+1,contours[1]], ..., [contours[n],last]
  // flags {int} bitmask. of importance is FT_OUTLINE_EVEN_ODD_FILL (0x2), or possibly FT_OUTLINE_REVERSE_FILL (0x4), others control FreeType's scanline conversion
  read_init();

//printf( "contours: %hd, points: %hd\n", outline.n_contours, outline.n_points );
  short c;
  short firstOnPoint;
  for ( c = 0; c < outline.n_contours; c++ ) {
    short start = ( c == 0 ? 0 : outline.contours[c-1] + 1 );
    short end = ( c == outline.n_contours - 1 ? outline.n_points - 1 : outline.contours[c] );
//printf( "  contour %hd, start: %hd, end: %hd\n", c, start, end );

    // walk to the first point that is "on"
    for ( firstOnPoint = start; firstOnPoint <= end; firstOnPoint++ ) {
      if ( outline.tags[firstOnPoint] & FT_CURVE_TAG_ON ) {
        break;
      }
    }
//printf( "e\n" );

    // start point
    read_start( ( double )( outline.points[firstOnPoint].x ), ( double )( -outline.points[firstOnPoint].y ), outline.tags[firstOnPoint] );
//printf( "f\n" );
    // middle points (up to the start point)
    for ( short k = ( firstOnPoint + 1 == end ? start : firstOnPoint + 1 ); k != firstOnPoint; k = ( k == end ? start : k + 1 ) ) {
//printf( "k: %hd\n", k );
      read_point( ( double )( outline.points[k].x ), ( double )( -outline.points[k].y ), outline.tags[k] );
    }
//printf( "g\n" );
    // start point again
    read_point( ( double )( outline.points[firstOnPoint].x ), ( double )( -outline.points[firstOnPoint].y ), outline.tags[firstOnPoint] );
//printf( "h\n" );
    read_end();
//printf( "i\n" );
  }
//printf( "d\n" );
}



void improved_close() {
  if ( num_segments > 0 ) {
    glyph_segments[num_segments].type = JS_GLYPH_TYPE_CLOSE;
    num_segments++;
  }
}
int read_improved_move( FT_Vector *p, void *user ) {
  improved_close();
  glyph_segments[num_segments].type = JS_GLYPH_TYPE_MOVE;
  glyph_segments[num_segments].x = (double)(p->x);
  glyph_segments[num_segments].y = -(double)(p->y);
  num_segments++;
  return 0; // success
}
int read_improved_line( FT_Vector *p, void *user ) {
  glyph_segments[num_segments].type = JS_GLYPH_TYPE_LINE;
  glyph_segments[num_segments].x = (double)(p->x);
  glyph_segments[num_segments].y = -(double)(p->y);
  num_segments++;
  return 0; // success
}
int read_improved_quadratic( FT_Vector *p1, FT_Vector *p, void *user ) {
  glyph_segments[num_segments].type = JS_GLYPH_TYPE_QUADRATIC;
  glyph_segments[num_segments].x1 = (double)(p1->x);
  glyph_segments[num_segments].y1 = -(double)(p1->y);
  glyph_segments[num_segments].x = (double)(p->x);
  glyph_segments[num_segments].y = -(double)(p->y);
  num_segments++;
  return 0; // success
}
int read_improved_cubic( FT_Vector *p1, FT_Vector *p2, FT_Vector *p, void *user ) {
  glyph_segments[num_segments].type = JS_GLYPH_TYPE_CUBIC;
  glyph_segments[num_segments].x1 = (double)(p1->x);
  glyph_segments[num_segments].y1 = -(double)(p1->y);
  glyph_segments[num_segments].x2 = (double)(p2->x);
  glyph_segments[num_segments].y2 = -(double)(p2->y);
  glyph_segments[num_segments].x = (double)(p->x);
  glyph_segments[num_segments].y = -(double)(p->y);
  num_segments++;
  return 0; // success
}

static const FT_Outline_Funcs segment_iterator = {
  (FT_Outline_MoveTo_Func) read_improved_move,
  (FT_Outline_LineTo_Func) read_improved_line,
  (FT_Outline_ConicTo_Func)read_improved_quadratic,
  (FT_Outline_CubicTo_Func)read_improved_cubic,
  0, 0
};

void read_improved_outline( FT_Outline *outline ) {
  num_segments = 0;
  FT_Outline_Decompose( outline, &segment_iterator, NULL );
  improved_close();
}





void read_glyph( const font_handle *font, unsigned int glyph_index ) {
  int err = FT_Load_Glyph( font->face, glyph_index, FT_LOAD_NO_SCALE );
  if ( err != NULL ) {
    printf( "FT_Load_Glyph err: %d.\n", err );
  }

  FT_Outline outline = font->face->glyph->outline;

  // read_outline( outline );
  read_improved_outline( &outline );
}

void read_shape( hb_glyph_info_t *glyph_info, hb_glyph_position_t *glyph_position, unsigned int glyph_count ) {
  num_glyphs = glyph_count;
  for ( unsigned int i = 0; i < glyph_count; i++ ) {
    // "codepoint" isn't a Unicode codepoint, but an index into the glyphs
    shape_glyphs[i].index = glyph_info[i].codepoint;

    shape_glyphs[i].x_offset = glyph_position[i].x_offset;
    shape_glyphs[i].y_offset = glyph_position[i].y_offset;
    shape_glyphs[i].x_advance = glyph_position[i].x_advance;
    shape_glyphs[i].y_advance = glyph_position[i].y_advance;
  }
}

// NOTE: stringToUTF16 usage can get str.charCodeAt() to give a UTF-16 code unit
// lang must be NUL-terminated
void read_text( const font_handle *font, const char *str, hb_direction_t dir, hb_script_t script, const char *lang ) {
  // unsigned int numFeatures = 7;
  // hb_feature_t *features = malloc( numFeatures * sizeof( hb_feature_t ) );
  // hb_feature_t feature0 = { HB_TAG( 'k', 'e', 'r', 'n' ), 1, 0, (unsigned int)(-1) };
  // hb_feature_t feature1 = { HB_TAG( 'v', 'k', 'r', 'n' ), 1, 0, (unsigned int)(-1) };
  // hb_feature_t feature2 = { HB_TAG( 'c', 'l', 'i', 'g' ), 1, 0, (unsigned int)(-1) };
  // hb_feature_t feature3 = { HB_TAG( 'l', 'i', 'g', 'a' ), 1, 0, (unsigned int)(-1) };
  // hb_feature_t feature4 = { HB_TAG( 'd', 'l', 'i', 'g' ), 1, 0, (unsigned int)(-1) };
  // hb_feature_t feature5 = { HB_TAG( 'h', 'l', 'i', 'g' ), 1, 0, (unsigned int)(-1) };
  // hb_feature_t feature6 = { HB_TAG( 'c', 'a', 'l', 't' ), 1, 0, (unsigned int)(-1) };
  // features[0] = feature0;
  // features[1] = feature1;
  // features[2] = feature2;
  // features[3] = feature3;
  // features[4] = feature4;
  // features[5] = feature5;
  // features[6] = feature6;

  // str = bidi_reorder_fast( str, dir ); // allocates new char*, need to free

  hb_buffer_t *buf = hb_buffer_create();

  hb_buffer_set_unicode_funcs( buf, unicode_funcs );

  //hb_buffer_set_unicode_funcs( buf, hb_icu_get_unicode_funcs() );
  hb_buffer_set_direction( buf, dir == HB_DIRECTION_RTL ? HB_DIRECTION_LTR : dir ); // RTL, TTB
  hb_buffer_set_script( buf, script ); // ARABIC, HAN, etc.
  hb_buffer_set_language( buf, hb_language_from_string( lang, -1 ) );

  hb_buffer_add_utf8( buf, str, strlen( str ), 0, strlen( str ) ); //buffer,text,text_length,item_offset,item_length
  // hb_shape( font->hb_ft_font, buf, features, numFeatures );
  hb_shape( font->hb_ft_font, buf, NULL, 0 );

  unsigned int glyph_count;
  hb_glyph_info_t     *glyph_info     = hb_buffer_get_glyph_infos( buf, &glyph_count );
  hb_glyph_position_t *glyph_position = hb_buffer_get_glyph_positions( buf, &glyph_count );

  // read the glyph reference information into our JS-readable buffers
  read_shape( glyph_info, glyph_position, glyph_count );

  hb_buffer_destroy( buf );

  // free( (void *)str );

  // free( features );
}

const unsigned int font_resolution = 72;

// we take ownership of *data, and will free it when we want (destroyFontHandle), NOT before
font_handle *createFontHandle( unsigned char *data, long size, long index ) {

  font_handle *font = malloc( sizeof( font_handle ) );
  font->data = data;

  int err;

  err = FT_New_Memory_Face( library, data, size, index, &( font->face ) );
  if ( err != NULL ) {
    printf( "FT_New_Memory_Face err: %d.\n", err );
  }

  err = FT_Set_Char_Size( font->face, 0, font->face->units_per_EM, font_resolution, font_resolution );
  if ( err != NULL ) {
    printf( "FT_Set_Char_Size err: %d.\n", err );
  }

  font->hb_ft_font = hb_ft_font_create( font->face, NULL );
  font->hb_ft_face = hb_ft_face_create( font->face, NULL );

  // TODO: adding this in ... did it prevent undefined behavior or something?
  // printf( "%p, %p\n", font->hb_ft_font, font->hb_ft_face );

  return font;
}

void destroyFontHandle( font_handle *font ) {
  hb_face_destroy( font->hb_ft_face );
  //hb_font_destroy( font->hb_ft_font ); // TODO: why does this fail?

  FT_Done_Face( font->face );

  free( (void *)( font->data ) );

  free( font );
}

void js_shutdown() {
  // TODO: clear all fonts?
  FT_Done_FreeType( library );
}

int main() {
  //printf( "Initializing FreeType\n" );

  int err = FT_Init_FreeType( &library );

  if ( err != NULL ) {
    printf( "FT_Init_FreeType err: %d.\n", err );
  }

  unicode_funcs = hb_ucdn_get_unicode_funcs();

  return 0;
}
