var FLOATING_POINT_LIMIT = 0.0000001;

function Scene () {
	this.objects = [];
}
Scene.prototype = {
	addObject: function (obj) {
		this.objects.push(obj);
	},
	bounce: function (lightBeam, reflections) {
		if (reflections == undefined) {
			reflections = 0;
		}
		var minParam = 0;
		var minObject = null;
		for (var i = 0; i < this.objects.length; i++) {
			var object = this.objects[i];
			var param = object.collisionParam(lightBeam);
			if (typeof param == "number" && (param > FLOATING_POINT_LIMIT || object != lightBeam.lastObject)) {
				if (minObject == null || minParam > param) {
					minParam = param;
					minObject = object;
				}
			}
		}
		lightBeam.lastObject = minObject;
		if (minObject != null) {
			lightBeam.move(minParam);
			if (!minObject.bounceLight(lightBeam)) {
				return;
			}
			if (reflections > 0) {
				return this.bounce(lightBeam, reflections - 1);
			}
		}
		return this.ambient(lightBeam);
	},
	colourSky0: function (hue) {return 0.9;},
	colourSky1: function (hue) {return 0.5;},
	colourGround0: function (hue) {return 0.25 + 0.5*hue;},
	colourGround1: function (hue) {return 0.75 - 0.5*hue;},
	ambient: function (lightBeam) {
		var direction = lightBeam.direction;
		if (direction.y > 0) {
			ceilingX = Math.round(direction.x/direction.y);
			ceilingZ = Math.round(direction.z/direction.y);
			if ((ceilingX + ceilingZ)%2 == 0) {
				lightBeam.glow(this.colourSky0);
			} else {
				lightBeam.glow(this.colourSky1);
			}
		} else if (direction.y < 0) {
			ceilingX = Math.round(direction.x/direction.y);
			ceilingZ = Math.round(direction.z/direction.y);
			if ((ceilingX + ceilingZ)%2 == 0) {
				lightBeam.glow(this.colourGround0);
			} else {
				lightBeam.glow(this.colourGround1);
			}
		}
	}
};

function Pixel(x, y) {
	this.x = x;
	this.y = y;
	this.totalR = 0;
	this.totalG = 0;
	this.totalB = 0;
	this.totalR2 = 0;
	this.totalG2 = 0;
	this.totalB2 = 0;
	this.total = 0;
	this.error = 1;
}
Pixel.prototype = {
	red: function (noiseAmount) {
		if (this.total == 0) {
			return Math.round(Math.random()*255);
		}
		var value = this.totalR/this.total;
		if (value == 0) {
			throw new Error("TEST");
		}
		if (noiseAmount != undefined) {
			var existingNoise = this.redError();
			var extraNoise = Math.sqrt(noiseAmount*noiseAmount - existingNoise*existingNoise);
			if (extraNoise > 0) {
				var randomValue = (Math.random() - 0.5)*Math.sqrt(12);
				value += randomValue*extraNoise;
			}
		}
		return Math.min(255, Math.max((255*value), 0));
	},
	green: function (noiseAmount) {
		if (this.total == 0) {
			return Math.round(Math.random()*255);
		}
		var value = this.totalG/this.total;
		if (noiseAmount != undefined) {
			var existingNoise = this.greenError();
			var extraNoise = Math.sqrt(noiseAmount*noiseAmount - existingNoise*existingNoise);
			if (extraNoise > 0) {
				var randomValue = (Math.random() - 0.5)*Math.sqrt(12);
				value += randomValue*extraNoise;
			}
		}
		return Math.min(255, Math.max((255*value), 0));
	},
	blue: function (noiseAmount) {
		if (this.total == 0) {
			return Math.round(Math.random()*255);
		}
		var value = this.totalB/this.total;
		if (noiseAmount != undefined) {
			var existingNoise = this.blueError();
			var extraNoise = Math.sqrt(noiseAmount*noiseAmount - existingNoise*existingNoise);
			if (extraNoise > 0) {
				var randomValue = (Math.random() - 0.5)*Math.sqrt(12);
				value += randomValue*extraNoise;
			}
		}
		return Math.min(255, Math.max((255*value), 0));
	},
	redError: function () {
		if (this.total <= 1) {
			return 1;
		}
		var std = Math.sqrt(Math.abs(this.totalR2 - this.totalR*this.totalR/this.total)/(this.total - 1));
		var stdError = std/Math.sqrt(this.total);
		if (this.totalR > this.total) {
			stdError *= this.total*this.total/(this.totalR*this.totalR);
		}
		return stdError;
	},
	blueError: function () {
		if (this.total <= 1) {
			return 1;
		}
		var std = Math.sqrt(Math.abs(this.totalG2 - this.totalG*this.totalG/this.total)/(this.total - 1));
		var stdError = std/Math.sqrt(this.total);
		if (this.totalG > this.total) {
			stdError *= this.total*this.total/(this.totalG*this.totalG);
		}
		return stdError;
	},
	greenError: function () {
		if (this.total <= 1) {
			return 1;
		}
		var std = Math.sqrt(Math.abs(this.totalB2 - this.totalB*this.totalB/this.total)/(this.total - 1));
		var stdError = std/Math.sqrt(this.total);
		if (this.totalB > this.total) {
			stdError *= this.total*this.total/(this.totalB*this.totalB);
		}
		return stdError;
	},
	recalculateError: function () {
		this.error = Math.max(this.redError(), this.greenError(), this.blueError());
	},
	add: function (red, green, blue, weight) {
		this.total += weight;
		this.totalR += red*weight;
		this.totalG += green*weight;
		this.totalB += blue*weight;
		this.totalR2 += red*red*weight;
		this.totalG2 += green*green*weight;
		this.totalB2 += blue*blue*weight;
	}
};

function Camera (scene, width, height, zoomScale) {
	this.position = new Vector3D(0, 0, 0);
	this.zoomScale = zoomScale;
	this.restartLightBeam = function (lightBeam, pixelX, pixelY) {
		var sceneX = (2*pixelX - width)/this.zoomScale;
		var sceneY = (height - 2*pixelY)/this.zoomScale;
		lightBeam.position = this.position;
		lightBeam.direction = new Vector3D(sceneX, sceneY, -1);
		lightBeam.resetFilter();
		lightBeam.resetColour();
	}
	this.pixels = [];
	this.sortedPixels = [];
	this.pixelErrorLimit = 0.1;
	for (var y = 0; y < height; y++) {
		this.pixels[y] = [];
		for (var x = 0; x < width; x++) {
			var pixel = new Pixel(x, y);
			this.pixels[y][x] = pixel;
			this.sortedPixels.push(pixel);
			var tmp = this.sortedPixels[this.sortedPixels.length - 1];
			var index = Math.floor(Math.random()*this.sortedPixels.length);
			this.sortedPixels[this.sortedPixels.length - 1] = this.sortedPixels[index];
			this.sortedPixels[index] = tmp;
		}
	}
	this.width = width;
	this.height = height;
	this.scene = scene;
}
Camera.prototype = {
	renderPixels: function (maxCount, reflections) {
		var lightBeam = new LightBeam();
		var scene = this.scene;
		var width = this.width;
		var height = this.height;
		var lightBeams = this.lightBeams;
		var pixels = this.pixels;
		var rendered = 0;
		var errorLimit = this.pixelErrorLimit;
		for (var i = 0; rendered < maxCount; i++) {
			var pixel = this.sortedPixels[i%this.sortedPixels.length];
			if (pixel.error < errorLimit) {
				if (i > 0) {
					i = -1;
					continue;
				} else {
					break;
				}
			}
			var x = pixel.x + Math.random() + Math.random() - 1;
			var y = pixel.y + Math.random() + Math.random() - 1;
			var randomX = (x >= 0) ? x%1 : (x % 1) + 1;
			var randomY = (y >= 0) ? y%1 : (y % 1) + 1;
			x = Math.floor(x);
			y = Math.floor(y);

			this.restartLightBeam(lightBeam, x + randomX, y + randomY);
			scene.bounce(lightBeam, reflections);
			var red = lightBeam.colour.value(0);
			var green = lightBeam.colour.value(0.3333);
			var blue = lightBeam.colour.value(0.6667);

			if (y >= 0) {
				if (x >= 0) {
					pixels[y][x].add(red, green, blue, (1 - randomX)*(1 - randomY));
				}
				if (x < width - 1) {
					pixels[y][x + 1].add(red, green, blue, randomX*(1 - randomY));
				}
			}
			if (y < height - 1) {
				if (x >= 0) {
					pixels[y + 1][x].add(red, green, blue, (1 - randomX)*randomY);
				}
				if (x < width - 1) {
					pixels[y + 1][x + 1].add(red, green, blue, randomX*randomY);
				}
			}
			rendered++;
		}
		return rendered;
	},
	renderToCanvas: function (canvas, includeNoise) {
		var width = canvas.width = this.width;
		var height = canvas.height = this.height;
		var context = canvas.getContext("2d");
		var pixels = this.pixels;
		
		includeNoise = !!(includeNoise || includeNoise == undefined);

		var imageData = context.getImageData(0, 0, width, height);
		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				var pixel = pixels[y][x];
				var index = (x + y*width)*4;
				var desiredNoise = includeNoise ? Math.max(this.pixelErrorLimit, this.sortedPixels[Math.floor(this.sortedPixels.length*0.05)].error) : undefined;
				imageData.data[index] = pixel.red(desiredNoise);
				imageData.data[index + 1] = pixel.green(desiredNoise);
				imageData.data[index + 2] = pixel.blue(desiredNoise);
				imageData.data[index + 3] = 255;
			}
		}
		context.putImageData(imageData, 0, 0);
	},
	renderNoiseToCanvas: function (canvas) {
		var width = canvas.width = this.width;
		var height = canvas.height = this.height;
		var context = canvas.getContext("2d");
		var pixels = this.pixels;

		var imageData = context.getImageData(0, 0, width, height);
		this.sortPixels();
		var maxError = this.sortedPixels[0].error;
		this.maxPixelError = maxError;
		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				var pixel = pixels[y][x];
				var index = (x + y*width)*4;
				var value = Math.max(0, Math.min(255, this.pixels[y][x].error/maxError*255));
				imageData.data[index] = value;
				imageData.data[index + 1] = value;
				imageData.data[index + 2] = value;
				imageData.data[index + 3] = (this.pixels[y][x].error > this.pixelErrorLimit) ? 255 : 127;
			}
		}
		context.putImageData(imageData, 0, 0);
	},
	sortPixels: function () {
		var width = this.width;
		var height = this.height;
		var pixels = this.pixels;
		
		for (var y = 0; y < height; y++) {
			for (var x = 0; x < width; x++) {
				var pixel = pixels[y][x];
				pixel.recalculateError();
			}
		}
		this.sortedPixels.sort(function (a, b) {
			return b.error - a.error;
		});
	}
};

function LightBeam(position, direction) {
	this.position = position;
	this.direction = direction;
	this.colour = new Spectrum();
}
LightBeam.prototype = {
	filterMultiply: function (multiplyFunction) {
		var oldFilter = this.filter;
		this.filter = function (spectrumFunction) {
			spectrumFunction = oldFilter(spectrumFunction);
			return function (hue) {
				return spectrumFunction(hue)*multiplyFunction(hue);
			};
		};
	},
	glow: function (spectrumFunction) {
		this.colour.add(this.filter(spectrumFunction));
	},
	resetFilter: function () {
		delete this.filter;
	},
	resetColour: function () {
		this.colour = new Spectrum();
	},
	filter: function (spectrumFunction) {
		return spectrumFunction;
	},
	move: function (param) {
		this.position = this.position.add(this.direction.scale(param));
	}
};

function Vector3D(x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
}
Vector3D.prototype = {
	mag2: function () {
		return this.x*this.x + this.y*this.y + this.z*this.z;
	},
	mag: function () {
		return Math.sqrt(this.mag2());
	},
	norm: function () {
		var mag = this.mag();
		return new Vector3D(this.x/mag, this.y/mag, this.z/mag);
	},
	dot: function (other) {
		return this.x*other.x + this.y*other.y + this.z*other.z;
	},
	scale: function (factor) {
		return new Vector3D(this.x*factor, this.y*factor, this.z*factor);
	},
	add: function (other) {
		return new Vector3D(this.x+other.x, this.y+other.y, this.z+other.z);
	},
};

var COMPONENT_COUNT = 3;
function Spectrum() {
	this.components = [];
	for (var i = 0; i < COMPONENT_COUNT; i++) {
		this.components.push(0);
	}
}
Spectrum.prototype = {
	add: function (spectrumFunction) {
		for (var i = 0; i < COMPONENT_COUNT; i++) {
			var hue = i/COMPONENT_COUNT;
			this.components[i] += spectrumFunction(hue);
		}
	},
	value: function (hue) {
		closestComponent = Math.round(hue*COMPONENT_COUNT) % COMPONENT_COUNT;
		return this.components[closestComponent];
	}
}
Spectrum.createRgb = function (r, g, b) {
	var components = [r, g, b];
	return function (hue) {
		var index = Math.round(hue * 3)%3;
		return components[index];
	};
};

var _storedNormalRandom = null;
function normalRandom(mean, std) {
	if (_storedNormalRandom != null) {
		var result = mean + _storedNormalRandom*std;
		_storedNormalRandom = null;
		return result;
	}
	var u, v;
	var s = 0; 
	while(s >= 1 || s == 0){ 
		u = Math.random()*2 - 1;
		v = Math.random()*2 - 1; 
		s = u*u + v*v; 
	} 
	var n = Math.sqrt(-2*Math.log(s)/s); 
	_storedNormalRandom = v * n; 
	return mean + u * n * std; 
}

var Surface = {
	Composite: function (components) {
		var count = components.length;
		return function (lightBeam, norm) {
			var index = Math.floor(Math.random()*count);
			return components[index](lightBeam, norm);
		};
	},
	Reflect: function (spectrumFunction) {
		return function (lightBeam, norm) {
			var dot = lightBeam.direction.dot(norm);
			lightBeam.direction = lightBeam.direction.add(norm.scale(-2*dot));
			lightBeam.filterMultiply(spectrumFunction);
			return true;
		};
	},
	Scatter: function (spectrumFunction, amount) {
		return function (lightBeam, norm) {
			var dot = lightBeam.direction.dot(norm);
			var direction1 = lightBeam.direction.add(norm.scale(-2*dot)).scale(1 - amount);

			var direction2 = new Vector3D(normalRandom(0, amount), normalRandom(0, amount), normalRandom(0, amount));
			lightBeam.direction = direction1.add(direction2);
			while (lightBeam.direction.dot(norm) <= 0) {
				var direction2 = new Vector3D(normalRandom(0, amount), normalRandom(0, amount), normalRandom(0, amount));
				lightBeam.direction = direction1.add(direction2);
			}
			lightBeam.filterMultiply(spectrumFunction);
			return true;
		};
	},
	Glow: function (spectrumFunction) {
		return function (lightBeam, norm) {
			lightBeam.glow(spectrumFunction);
			return false;
		};
	}
};

function BasicSphere(position, radius, surfaceFunction) {
	this.position = position;
	this.radius = radius;
	this.surfaceFunction = surfaceFunction;
}
BasicSphere.prototype = {
	collisionParam: function (lightBeam) {
		var relativeCentre = this.position.add(lightBeam.position.scale(-1));
		// Solve the quadratic:
		//  |relativeCentre - direction*param|^2 = r^2
		//  relativeCentre^2 - 2*(direction . relativeCentre)*param + direction^2*param^2 = r^2
		var a = lightBeam.direction.mag2();
		var b = -2*lightBeam.direction.dot(relativeCentre);
		var c = relativeCentre.mag2() - this.radius*this.radius;
		
		var innerPart = (b*b - 4*a*c);
		if (innerPart < 0) {
			return false;
		}
		var sqrtPart = Math.sqrt(innerPart);
		if (-b - sqrtPart > 0) {
			return (-b - sqrtPart)/2/a;
		} else if (-b + sqrtPart > 0) {
			return (-b + sqrtPart)/2/a;
		} else {
			return false;
		}
	},
	bounceLight: function (lightBeam) {
		var relativeCentre = lightBeam.position.add(this.position.scale(-1));
		var norm = relativeCentre.norm();	
		return this.surfaceFunction(lightBeam, norm);
	}
};