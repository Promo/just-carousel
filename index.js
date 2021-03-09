/* global module, window, document */

var JustCarousel = (function() {
	function Carousel(options){
		this.root = options.root;
		this.inner = this.root.querySelector('ul');
		this.slides = this.inner.children;
		this.slidesLength = this.slides.length;
		this.isMoving = false;
		this.collectingSpeedTimeout = 0;
		this.currentSlideIdx = options.startIdx || 0;

		if (this.currentSlideIdx > this.slides.length -1) {
			console.warn('startIdx is more acceptable. Set up ' + this.currentSlideIdx + ' but there are only ' + this.slides.length + ' slides. Taken ' + (this.slides.length -1) + '.');
			this.currentSlideIdx = this.slides.length -1;
		} else if (this.currentSlideIdx < 0) {
			console.warn('startIdx is less than zero. Taken 0.');
			this.currentSlideIdx = 0;
		}

		this.neededSlideIdx = null;
		this.animationDuration = options.duration || 250;
		this.width = this.root.getBoundingClientRect().width;
		this.currentOffset = 100 / this.slides.length * this.currentSlideIdx * -1;
		this.prevDeltaX = null;

		this.timing =
			options.timingFunction ||
			(function (t) {
				return t * (2 - t);
			});

		this._onTouchStart = onTouchStart.bind(this);
		this._onTouchEnd = onTouchEnd.bind(this);
		this._onTouchMove = onTouchMove.bind(this);
		this._transformTo = transformTo.bind(this);
		this._animateToSlide = animateToSlide.bind(this);
		this._animate = animate.bind(this);
		this._onAnimationEnd = onAnimationEnd.bind(this);
		this._getMostVisibleSlideIdx = getMostVisibleSlideIdx.bind(this);
		this._getNeededSlide = getNeededSlide.bind(this);

		this._onChangePos = (options.onChangePos || nope).bind(this);
		this._onMovingStart = (options.onMovingStart || nope).bind(this);
		this._onMovingEnd = (options.onMovingEnd || nope).bind(this);

		if (typeof exports === 'object') {
			module.exports = JustCarousel;
		}

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
			checkForUpdate.call(this);
			onMovingStart.call(this, {currentSlide: this.currentSlideIdx});

			this.isMoving = false;
			this.endX = 0;
			this.startX = 0;

			var self = this;

			if (idx < 0) {
				var pos = this.width / 100 / this.slides.length;

				this._animate(pos, 80, function () {
					self._animate(0, 80, function () {
						onMovingEnd.call(self, {
							prevSlide: self.currentSlideIdx,
							currentSlide: self.currentSlideIdx
						});
					});
				});

				return this;
			}

			if (idx + 1 > this.slides.length) {
				var pos = this.width / 100 / this.slides.length;

				var rightPoint = -100 / this.slides.length * (this.slides.length - 1);

				this._animate(rightPoint - pos, 80, function () {
					self._animate(rightPoint, 80, function () {
						onMovingEnd.call(self, {
							prevSlide: self.currentSlideIdx,
							currentSlide: self.currentSlideIdx
						});
					});
				});

				return this;
			}

			this.neededSlideIdx = idx;

			if (this._isAnimation) {
				this._isAnimation = false;
				cancelAnimationFrame(this.myReq);
			}

			this._animateToSlide(this.neededSlideIdx, needQuick, this._onAnimationEnd);
			this.isBehindRightBroder = false;
			this.isBehindLeftBroder = false;

			return this;
		},

		update: function() {
			checkForUpdate.call(this);
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

		var changeInfo = {
			prevSlide: this.currentSlideIdx,
			currentSlide: this.neededSlideIdx
		};

		onMovingEnd.call(this, changeInfo);

		this._onChangePos(changeInfo);

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
		this.inner.style.webkitTransform = 'translate3d(' + this.currentOffset + '%,0,0)';
		this.inner.style.transform = 'translate3d(' + this.currentOffset + '%,0,0)';
		this.inner.style.mozTransformStyle = 'preserve-3d'; /* fixes lag on firefox */
		this.inner.style.transformStyle = 'preserve-3d';
		this.inner.style.webkitTapHighlightColor = 'rgba(0, 0, 0, 0)';
		this.inner.style.webkitUserDrag = 'none';
		this.inner.style.webkitTouchCallout = 'none';

		for (var i = 0; i < this.slides.length; i++) {
			applyStylesToSlide.call(this, this.slides[i]);
		}
	}

	function applyStylesToSlide(slide) {
		slide.style.height = '100%';
		slide.style.width = 100 / this.slides.length + '%';
		slide.style.float = 'left';
	}

	function addEvents() {
		this.root.addEventListener('touchstart', this._onTouchStart, false);
		this.root.addEventListener('touchend', this._onTouchEnd, false);
		this.root.addEventListener('touchcancel', this._onTouchEnd, false);
		this.root.addEventListener('touchmove', this._onTouchMove);
	}

	function onTouchStart(e) {
		cancelAnimationFrame(this.myReq);

		this.justTouched = true;

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

			if (this.scrollingHorizontally) {
				onMovingStart.call(this, {currentSlide: this.currentSlideIdx});
			}
		}

		if (!this.scrollingHorizontally && this.neededSlideIdx === null) {
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
		return this.neededSlideIdx === null ? this.currentSlideIdx : this.neededSlideIdx;
	}

	function animateToSlide(idx, needQuick, cb) {
		var self = this;

		var duration = needQuick ? 150 : this.animationDuration;

		var endPoint = idx * 100 * -1 / this.slides.length;

		var start = performance.now();

		var currentOffset = this.currentOffset * 1; // copy

		this._isAnimation = true;
		this.myReq = requestAnimationFrame(function animate(time) {
			// alert(time);
			clearTimeout(self._isAnimationTimeout);
			self._isAnimationTimeout = setTimeout(function () {
				self._isAnimation = false;
			}, 150);

			var timeFraction = (time - start) / duration;

			if (timeFraction > 1) timeFraction = 1;
			if (timeFraction < 0) timeFraction = 0;

			var progress = self.timing(timeFraction);
			var value = (endPoint - currentOffset) * progress + currentOffset;

			self.currentOffset = value;

			self.inner.style.webkitTransform = 'translate3d(' + value + '%, 0, 0)';
			self.inner.style.transform = 'translate3d(' + value + '%, 0, 0)';

			if (timeFraction < 1) {
				self.myReq = requestAnimationFrame(animate);
			} else {
				self._isAnimation = false;
				cb.call(self);
			}
		});
	}

	function animate(pos, duration, cb) {
		var self = this;
		var start = performance.now();

		this.shakeReq = requestAnimationFrame(function animate(time) {
			var timeFraction = (time - start) / duration;
			if (timeFraction > 1) timeFraction = 1;
			if (timeFraction < 0) timeFraction = 0;

			var progress = self.timing(timeFraction);
			var range = pos - self.currentOffset;

			var value = self.currentOffset + range * progress;

			self.inner.style.webkitTransform = 'translate3d(' + value + '%, 0, 0)';
			self.inner.style.transform = 'translate3d(' + value + '%, 0, 0)';

			if (timeFraction < 1) {
				self.shakeReq = requestAnimationFrame(animate);
			} else {
				self.currentOffset = pos;
				cb = cb || nope;
				cb.call(self);
			}
		});
	}

	function transformTo(endPoint) {
		this.inner.style.webkitTransform = 'translate3d(' + endPoint + '%, 0, 0)';
		this.inner.style.transform = 'translate3d(' + endPoint + '%, 0, 0)';
	}

	function getMostVisibleSlideIdx() {
		var currentOffset = Math.abs(this.currentOffset);
		var itemWidth = 100 / this.slides.length;
		var leftSlideIdx = Math.floor(currentOffset / itemWidth);
		var leftSlidePart = (leftSlideIdx + 1) * itemWidth;

		return leftSlideIdx + (itemWidth / 2 > leftSlidePart - currentOffset ? 1 : 0);
	}

	function checkForUpdate() {
		if (this.slidesLength === this.slides.length) {
			return;
		}

		this.slidesLength = this.slides.length;

		this.inner.style.width = 100 * this.slides.length + '%';

		for (var i = 0; i < this.slidesLength; i++) {
			applyStylesToSlide.call(this, this.slides[i]);
		}

		this.currentOffset = 100 / this.slides.length * this.currentSlideIdx * -1;
		this.inner.style.width = 100 * this.slides.length + '%';
		this.inner.style.webkitTransform = 'translate3d(' + this.currentOffset + '%,0,0)';
	}

	function onMovingStart(data) {
		if (!this._isAnimating) {
			this._isAnimating = true;
			this._onMovingStart(data);
		}
	}

	function onMovingEnd(data) {
		this._isAnimating = false;
		this._onMovingEnd(data);
	}

	function nope() {}

	return Carousel;
}());

if (typeof exports === 'object') {
	module.exports = JustCarousel;
}

(function() {
	if (typeof window === 'undefined') {
		return;
	}

	window.requestAnimationFrame || function () {
		'use strict';

		window.requestAnimationFrame = window.msRequestAnimationFrame
			|| window.mozRequestAnimationFrame
			|| function () {

				var fps = 60;
				var delay = 1000 / fps;
				var animationStartTime = Date.now();
				var previousCallTime = animationStartTime;

				return function requestAnimationFrame(callback) {
					var requestTime = Date.now();
					var timeout = Math.max(0, delay - (requestTime - previousCallTime));
					var timeToCall = requestTime + timeout;

					previousCallTime = timeToCall;

					return window.setTimeout(function onAnimationFrame() {
						callback(timeToCall - animationStartTime);

					}, timeout);
				};
			}();

		window.cancelAnimationFrame = window.mozCancelAnimationFrame
			|| window.cancelRequestAnimationFrame
			|| window.msCancelRequestAnimationFrame
			|| window.mozCancelRequestAnimationFrame
			|| function cancelAnimationFrame(id) {
				window.clearTimeout(id);
			};

	}();
}());

(function(){
	if (typeof window === 'undefined') {
		return;
	}

	if (!window.performance || !window.performance.now) {
		Date.now || ( Date.now = function () {
			return new this().getTime();
		});

		( window.performance ||
			( window.performance = {} ) ).now = function () {
			return Date.now() - offset;
		};

		var offset = ( window.performance.timing ||
			( window.performance.timing = {} ) ).navigatorStart ||
			( window.performance.timing.navigatorStart = Date.now() );
	}
})();
