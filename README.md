# js-raytrace-demo

### Monte-Carlo raytracing in JavaScript

The demo scene is two interlocking spheres (with varying scattering behaviour), with tiled floor/ceiling, and two luminescent spheres out-of-shot.

* `index.html` - single image, 400x240
* `stereographic.html` - two-camera setup, 200x120

The raytracer attempts to estimate the error in the image (based on neighbourhood noise), and selectively renders certain pixels to attempt to get an even level of noise.

The preview/display *adds* noise to the image in an attempt to simulate an even level of noise across the image.