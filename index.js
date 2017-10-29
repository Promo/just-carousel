/* global module, window, document */

(function() {
	var lastTime = 0;
	var vendors = ['ms', 'moz', 'webkit', 'o'];
	for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
		window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
		window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
			|| window[vendors[x]+'CancelRequestAnimationFrame'];
	}

	if (!window.requestAnimationFrame) {
		window.requestAnimationFrame = function(callback, element) {
			var currTime = new Date().getTime();
			var timeToCall = Math.max(0, 16 - (currTime - lastTime));
			var id = window.setTimeout(function() { callback(currTime + timeToCall); },
				timeToCall);
			lastTime = currTime + timeToCall;
			return id;
		};
	}

	if (!window.cancelAnimationFrame) {
		window.cancelAnimationFrame = window.mozCancelAnimationFrame || function(id) {
			clearTimeout(id);
		};
	}
}());

var JustCarousel = (function() {
	function Carousel(options){
		this.root = options.root;
		this.inner = this.root.querySelector('ul');
		this.slides = this.inner.children;
		this.isMoving = false;
		this.collectingSpeedTimeout = 0;
		this.currentSlideIdx = 0;
		this.animationDuration = 250;
		this.width = this.root.getBoundingClientRect().width;
		this.currentOffset = 0;
		this.prevDeltaX = null;

		this._onTouchStart = onTouchStart.bind(this);
		this._onTouchEnd = onTouchEnd.bind(this);
		this._onTouchMove = onTouchMove.bind(this);
		this._transformTo = transformTo.bind(this);
		this._animateTo = animateTo.bind(this);
		this._onAnimationEnd = onAnimationEnd.bind(this);
		this._getMostVisibleSlideIdx = getMostVisibleSlideIdx.bind(this);
		this._getNeededSlide = getNeededSlide.bind(this);

		this._onChangePos = (options.onChangePos || nope).bind(this);

		applyStyles.call(this);
		addEvents.call(this);
	}

	Carousel.prototype = {
		constructor: Carousel,

		slidePrev: function(){
			return this.slideTo(this._getNeededSlide() - 1);
		},

		slideNext: function(){
			return this.slideTo(this._getNeededSlide() + 1);
		},

		slideTo: function (idx, needQuick) {
			this.isMoving = false;
			this.endX = 0;
			this.startX = 0;

			if (idx < 0 || idx + 1 > this.slides.length) {
				return this; // need to show begin/end of list
			}

			this.neededSlideIdx = idx;

			this._animateTo(this.neededSlideIdx, needQuick, this._onAnimationEnd);
			this.isBehindRightBroder = false;
			this.isBehindLeftBroder = false;

			return this;
		},

		destroy: function () {
			this.root.removeEventListener('touchstart', this._onTouchStart, false);
			this.root.removeEventListener('touchend', this._onTouchEnd, false);
			this.root.removeEventListener('touchcancel', this._onTouchEnd, false);
			this.root.removeEventListener('touchmove', this._onTouchMove, false);

			this.root.parentNode.removeChild(this.root);
		}
	};

	function onAnimationEnd() {
		this.prevDeltaX = null;

		this._onChangePos({
			prevSlide: this.currentSlideIdx,
			currentSlide: this.neededSlideIdx
		});

		this.currentSlideIdx = this.neededSlideIdx * 1;
		this.neededSlideIdx = null;
	}

	function applyStyles() {
		this.root.style.padding = '0';
		this.root.style.overflow = 'hidden';
		this.root.style.position = 'relative';

		this.inner.style.listStyleType = 'none';
		this.inner.style.willChange = 'transform';
		this.inner.style.margin = '0';
		this.inner.style.padding = '0';
		this.inner.style.height = '100%';
		this.inner.style.width = 100 * this.slides.length + '%';
		this.inner.style.transform = 'translate3d(0,0,0)';
		this.inner.style.mozTransformStyle = 'preserve-3d'; /* fixes lag on firefox */
		this.inner.style.transformStyle = 'preserve-3d';
		this.inner.style.webkitTapHighlightColor = 'rgba(0, 0, 0, 0)';
		this.inner.style.webkitUserDrag = 'none';
		this.inner.style.webkitTouchCallout = 'none';
		this.inner.style.userSelect = 'none';
		this.inner.style.webkitUserSelect = 'none';

		for (var i = 0; i < this.slides.length; i++) {
			this.slides[i].style.height = '100%';
			this.slides[i].style.width = 100 / this.slides.length + '%';
			this.slides[i].style.float = 'left';
		}
	}

	function addEvents() {
		this.root.addEventListener('touchstart', this._onTouchStart, false);
		this.root.addEventListener('touchend', this._onTouchEnd, false);
		this.root.addEventListener('touchcancel', this._onTouchEnd, false);
	}

	function onTouchStart(e) {
		cancelAnimationFrame(this.myReq);

		this.justTouched = true;
		this.root.addEventListener('touchmove', this._onTouchMove);

		this.startCoords = {
			x: e.touches[0].clientX,
			y: e.touches[0].clientY
		};
	}

	function onTouchMove(e) {
		var self = this;

		var touch = e.touches[0];
		var totalDeltaX = touch.clientX - this.startCoords.x;
		var totalDeltaY = touch.clientY - this.startCoords.y;

		if (this.justTouched) {
			this.scrollingHorizontally = Math.abs(totalDeltaX) >= Math.abs(totalDeltaY);
			this.justTouched = false;
		}

		if (!this.scrollingHorizontally && this.neededSlideIdx === null) {
			this.root.removeEventListener('touchmove', this._onTouchMove);
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		var deltaX = touch.clientX - (this.prevDeltaX || this.startCoords.x);

		this.prevDeltaX = touch.clientX;

		if (deltaX === 0) {
			return;
		}

		if (!this.isMoving) {
			this.startX = touch.clientX;
		}

		this.isMoving = true;
		this.endX = touch.clientX;
		clearTimeout(this.collectingSpeedTimeout);

		this.collectingSpeedTimeout = setTimeout(function () {
			self.isMoving = false;
		}, 20);

		var offset = deltaX / this.width * 100 / this.slides.length;

		var lastItemOffset = (100 - 100 / this.slides.length) * -1 - 0.0001;

		if (this.currentOffset + offset > 0) {
			offset = offset / 3;
			this.isBehindLeftBroder = true;
		} else if ((this.currentOffset + offset) < lastItemOffset) {
			offset = offset / 3;
			this.isBehindRightBroder = true;
		}

		this.currentOffset = this.currentOffset + offset;

		this._transformTo(this.currentOffset);
	}

	function onTouchEnd() {
		this.prevDeltaX = null;
		this.root.removeEventListener('touchmove', this._onTouchMove);
		this.justTouched = false;

		if (!this.scrollingHorizontally && this.neededSlideIdx === null) {
			this.endX = 0;
			this.startX = 0;
			this.isMoving = false;
			return;
		}

		if (this.isBehindLeftBroder) {
			this.slideTo(0, true);
			return;
		}

		if (this.isBehindRightBroder) {
			this.slideTo(this.slides.length - 1, true);
			return;
		}

		var currentOffset = Math.abs(this.currentOffset);

		if (!this.isMoving) {
			var mostVisibleSlide = this._getMostVisibleSlideIdx();
			this.slideTo(mostVisibleSlide);
			return;
		}

		var direction = this.endX > this.startX ? -1 : 1;

		if (this.endX > this.startX) {
			direction = -1;
		} else {
			direction = 1;
		}

		// Условие, что мотаем на сл. слайд будучи проскроленный на предыдущий
		if (
			this.neededSlideIdx === null &&
			(direction > 0 && currentOffset < 100 / this.slides.length * this.currentSlideIdx ||
				direction < 0 && currentOffset > 100 / this.slides.length * this.currentSlideIdx)
		) {
			this.slideTo(this.currentSlideIdx, true);
			return;
		}

		if (!this._isAnimation) {
			this.neededSlideIdx = null;
			// this.currentSlideIdx = this._getMostVisibleSlideIdx(); // todo check
		}

		var nextSlide = this._getNeededSlide() + direction;

		if (nextSlide < 0) {
			nextSlide = 0;
		}

		if (nextSlide > this.slides.length - 1) {
			nextSlide = this.slides.length - 1;
		}

		this.slideTo(nextSlide);
	}

	function getNeededSlide() {
		return this.neededSlideIdx !== null ? this.neededSlideIdx : this.currentSlideIdx;
	}

	function animateTo(idx, needQuick, cb) {
		var self = this;

		var duration = needQuick ? 150 : this.animationDuration;

		var endPoint = idx * 100 * -1 / this.slides.length;

		var start = performance.now();

		var currentOffset = this.currentOffset * 1; // copy

		this._isAnimation = true;

		this.myReq = requestAnimationFrame(function animate(time) {
			clearTimeout(self._isAnimationTimeout);
			self._isAnimationTimeout = setTimeout(function () {
				self._isAnimation = false;
			}, 150);

			var timeFraction = (time - start) / duration;
			if (timeFraction > 1) timeFraction = 1;
			if (timeFraction < 0) timeFraction = 0;

			var progress = timing(timeFraction);
			var value = (endPoint - currentOffset) * progress + currentOffset;

			self.currentOffset = value;
			self.inner.style.transform = 'translate3d(' + value + '%, 0, 0)';

			if (timeFraction < 1) {
				self.myReq = requestAnimationFrame(animate);
			} else {
				self._isAnimation = false;
				cb.call(self);
			}
		});
	}

	function timing(t) {
		return t * (2 - t);
	}

	function transformTo(endPoint) {
		this.inner.style.transform = 'translate3d(' + endPoint + '%, 0, 0)';
	}

	function getMostVisibleSlideIdx() {
		var currentOffset = Math.abs(this.currentOffset);
		var itemWidth = 100 / this.slides.length;
		var leftSlideIdx = Math.floor(currentOffset / itemWidth);
		var leftSlidePart = (leftSlideIdx + 1) * itemWidth;

		return leftSlideIdx + (itemWidth / 2 > leftSlidePart - currentOffset ? 1 : 0);
	}

	function nope() {}

	return Carousel;
}());

if (typeof exports === 'object') {
	module.exports = JustCarousel;
}
