.PHONY: clean

SRCS = src/header.js                 \
       src/namespace.js              \
       src/EventTarget.js            \
       src/eventTargetSugar.js

build: $(LIBS) $(SRCS)
	mkdir -p build
	cat $(SRCS) >build/evento.js
	jsmin <build/evento.js >build/evento-tmp.js
	cat src/header.js build/evento-tmp.js >build/evento-min.js
	rm build/evento-tmp.js

clean:
	rm -rf build
