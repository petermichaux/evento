.PHONY: clean

SRCS = src/header.js                 \
       src/namespace.js              \
       src/EventTarget.js            \
       src/eventTargetSugar.js

evento.js: $(LIBS) $(SRCS)
	cat $(SRCS) > evento.js

clean:
	rm evento.js
