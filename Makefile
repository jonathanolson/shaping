
all: build/shaping.min.js

bundle.js: wrapper.js
	./node_modules/.bin/uglifyjs module-prefix.js jquery-2.1.0.min.js lodash-2.4.1.min.js scenery-0.1-dev.js \
	                             wrapper.js punycode.min.js fonts/notoNaskhArabicRegularBase64.js \
	                             fonts/notoSerifRegularBase64.js fonts/notoSansHebrewRegularBase64.js \
	                             bidi-test.js \
	                             -o bundle.js \
	                             --compress --mangle

objs/shaping/wrapper.js: objs/shaping/wrapper.o
	~/dev/emscripten/emsdk_portable/emscripten/1.16.0/emcc -O3 -o objs/shaping/wrapper.js objs/shaping/wrapper.o objs/ucdn/*.o objs/zlib/*.o objs/freetype/*.o objs/harfbuzz/*.o objs/fribidi/*.o \
	    -s EXPORTED_FUNCTIONS="['_main','_getNumSegments','_getGlyphSegments','_getNumGlyphs','_getShapeGlyphs','_getUnitsPerEM','_bidi_reorder_fast','_bidi_reorder_and_store','_getLogicalToVisual','_getVisualToLogical','_getEmbeddingLevels','_getUnicodeSize','_bidi_reorder_unicode_and_store','_read_glyph','_read_text','_createFontHandle','_destroyFontHandle','_getScript','_getDirectionLTR','_getDirectionRTL','_getDirectionTTB','_getDirectionBTT','_getScriptCOMMON','_getScriptINHERITED','_getScriptUNKNOWN','_getScriptARABIC','_getScriptARMENIAN','_getScriptBENGALI','_getScriptCYRILLIC','_getScriptDEVANAGARI','_getScriptGEORGIAN','_getScriptGREEK','_getScriptGUJARATI','_getScriptGURMUKHI','_getScriptHANGUL','_getScriptHAN','_getScriptHEBREW','_getScriptHIRAGANA','_getScriptKANNADA','_getScriptKATAKANA','_getScriptLAO','_getScriptLATIN','_getScriptMALAYALAM','_getScriptORIYA','_getScriptTAMIL','_getScriptTELUGU','_getScriptTHAI','_getScriptTIBETAN','_getScriptBOPOMOFO','_getScriptBRAILLE','_getScriptCANADIAN_SYLLABICS','_getScriptCHEROKEE','_getScriptETHIOPIC','_getScriptKHMER','_getScriptMONGOLIAN','_getScriptMYANMAR','_getScriptOGHAM','_getScriptRUNIC','_getScriptSINHALA','_getScriptSYRIAC','_getScriptTHAANA','_getScriptYI','_getScriptDESERET','_getScriptGOTHIC','_getScriptOLD_ITALIC','_getScriptBUHID','_getScriptHANUNOO','_getScriptTAGALOG','_getScriptTAGBANWA','_getScriptCYPRIOT','_getScriptLIMBU','_getScriptLINEAR_B','_getScriptOSMANYA','_getScriptSHAVIAN','_getScriptTAI_LE','_getScriptUGARITIC','_getScriptBUGINESE','_getScriptCOPTIC','_getScriptGLAGOLITIC','_getScriptKHAROSHTHI','_getScriptNEW_TAI_LUE','_getScriptOLD_PERSIAN','_getScriptSYLOTI_NAGRI','_getScriptTIFINAGH','_getScriptBALINESE','_getScriptCUNEIFORM','_getScriptNKO','_getScriptPHAGS_PA','_getScriptPHOENICIAN','_getScriptCARIAN','_getScriptCHAM','_getScriptKAYAH_LI','_getScriptLEPCHA','_getScriptLYCIAN','_getScriptLYDIAN','_getScriptOL_CHIKI','_getScriptREJANG','_getScriptSAURASHTRA','_getScriptSUNDANESE','_getScriptVAI','_getScriptAVESTAN','_getScriptBAMUM','_getScriptEGYPTIAN_HIEROGLYPHS','_getScriptIMPERIAL_ARAMAIC','_getScriptINSCRIPTIONAL_PAHLAVI','_getScriptINSCRIPTIONAL_PARTHIAN','_getScriptJAVANESE','_getScriptKAITHI','_getScriptLISU','_getScriptMEETEI_MAYEK','_getScriptOLD_SOUTH_ARABIAN','_getScriptOLD_TURKIC','_getScriptSAMARITAN','_getScriptTAI_THAM','_getScriptTAI_VIET','_getScriptBATAK','_getScriptBRAHMI','_getScriptMANDAIC','_getScriptCHAKMA','_getScriptMEROITIC_CURSIVE','_getScriptMEROITIC_HIEROGLYPHS','_getScriptMIAO','_getScriptSHARADA','_getScriptSORA_SOMPENG','_getScriptTAKRI']" \
	    -s NO_EXIT_RUNTIME="1" \
	    -s DEAD_FUNCTIONS="[]"
#      -s DEAD_FUNCTIONS="[]" -s SHOW_LABELS="1" -s ASSERTIONS="2"

objs/shaping/wrapper.o: src/wrapper.c
	mkdir -p objs/shaping
	~/dev/emscripten/emsdk_portable/emscripten/1.16.0/emcc -O3 -c src/wrapper.c -I./include -I./include/freetype -o objs/shaping/wrapper.o

build/shaping.js: objs/shaping/wrapper.js src/text-shape.js src/module-prefix.js src/module-postfix.js
	mkdir -p build
	echo "(function(){" > build/shaping.js
	cat src/module-prefix.js objs/shaping/wrapper.js src/text-shape.js src/module-postfix.js >> build/shaping.js
	echo "})();" >> build/shaping.js

build/shaping.min.js: build/shaping.js
	npm install uglifyjs
	./node_modules/.bin/uglifyjs build/shaping.js -o build/shaping.min.js --compress --mangle

clean:
	rm -f objs/shaping/*
	rm -f build/*
