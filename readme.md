# just-carousel

Just an 1-item-on-screen carousel that works naturally like an iOS/android desktops and nothing else.

[An Example](https://promo.github.io/just-carousel/demo/index.html)

## Advantages

* No dependencies.  
* 1.6kb min + gzip, 8kb full.  
* Android 4+, WP8+, iOS 7+.  
* Written on es3 so must work on most desktop browsers (only requires support for `transform3d`).  
* Easy integration with React, Vue, etc.
* Unblocking UI (carousel reacts on any user action at any time). For example you can make 3 fast swype in a row.
* Based on percent-layout. It means that change of device orientation is occurring fast, because doesn't recalculate any
dimensions. Specially fine with responsive layout outside and inside of carousel. 

## Limitations
* Supports only one slide on the screen at a time (but you can try to layout many items in each base slide).  
* No infinity mode (yet).  
* Doesn't have additional elements (like a prev/next arrows, cute little circles, etc). So you will have to do it
yourself using api.  
* Doesn't react on mouse events.  
* You need to take care that all slides were the same height.  

Thus, this carousel will suit you, if you just need a lightweight, simple, 1-item-on-screen touch-carousel.  

Need something more? Try [Swiper](https://github.com/nolimits4web/Swiper).

## Install

```bash
$ npm install -S just-carousel
```

or oldschool method:

```html
<script src="just-carousel.js"></script>
```

## Usage
```html
<div class="carousel">
	<ul> <!-- Root element must contain ul > li structure -->
		<li>1</li> <!-- li may contain anything -->
		<li>2</li>
		<li>3</li>
	</ul>
</div>
```

```js
const justCarousel = require('just-carousel'); // ← if you use build system

const carousel = new JustCarousel({
	root: document.querySelector('.carousel'),
	onChangePos: function (data) {
		console.log(data); // {prevSlide, currentSlide}
	}
});
```

## Options

### root

Type: `DOM Node`  
Required

A root element of carousel.

### startIdx

Starting element.

### onChangePos

Type: `function`

Calls when the end of the animation. Accepts only object argument
contains fields: `prevSlide` and `currentSlide`.

## Instance methods

### slideNext(), slidePrev()

### slideTo(index\<Number\>)

### destroy()

## License

MIT © [f0rmat1k](https://github.com/f0rmat1k)  
  
Special thanks to [air-breathing](https://github.com/air-breathing).
