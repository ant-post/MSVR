'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let surfaceWebCam;              // A substrate for webcam image
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let stereoCam;                  // Object holding stereo camera and its parameters

let iTextureWebCam = -1;

let video;

const defaultStereoCamera = {
    eyeSeparation: 0.2,         //decimiters
    convergenceDistance: 25.0,  //decimiters
    fieldOfViewAngle: 20,       //decimiters
    nearClippingDistance: 8.0,  //decimiters

    aspectRatio: 800 / 600,     // canvas.width / canvas.height
    farClippingDistance: 200    //decimiters
};

// Constructor
function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;

    this.iAttribTexCoord = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;

    this.iModelViewMatrix = -1;
    this.iProjectionMatrix = -1;
    this.iTexture = -1;
    this.iUseTexture = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}

/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL. Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // PATH ZERO: DRAW ZERO PARALLAX WEBCAM
    // TODO: This code draws webCam surface
    if (iTextureWebCam && video.srcObject && video.videoWidth > 0 && video.videoHeight > 0) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, iTextureWebCam);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
        if (gl.getError() !== gl.NO_ERROR) {
            console.error("WebGL error after texSubImage2D:", gl.getError());
        }

        // Re-buffer webcam surface data to match working code
        let webcamData = {};
        CreateSurfaceData(webcamData, true);
        surfaceWebCam.BufferData(webcamData.verticesF32, webcamData.indicesU16, webcamData.texCoordsF32);

        let matrOrth = m4.orthographic(-1, 1, -1, 1, -1, 1);
        gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, matrOrth);
        gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, m4.identity());
        gl.uniform1i(shProgram.iTexture, 0);
        gl.uniform1i(shProgram.iUseTexture, 1);

        gl.bindBuffer(gl.ARRAY_BUFFER, surfaceWebCam.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, surfaceWebCam.iTexCoordBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexCoord);

        surfaceWebCam.Draw();
        if (gl.getError() !== gl.NO_ERROR) {
            console.error("WebGL error after surfaceWebCam.Draw:", gl.getError());
        }

        gl.uniform1i(shProgram.iUseTexture, 0);
        gl.disableVertexAttribArray(shProgram.iAttribTexCoord);
    }

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    const colorPolygon = new Float32Array([0.5, 0.5, 0.5, 1]);
    const colorEdge = new Float32Array([1, 1, 1, 1]);

    // The FIRST PASS (for the left eye)
    let matrLeftFrustum = stereoCam.calcLeftFrustum();
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, matrLeftFrustum);
    let translateLeftEye = m4.translation(stereoCam.eyeSeparation / 2, 0, 0);
    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateLeftEye, matAccum0);
    let matAccum2 = m4.multiply(translateToPointZero, matAccum1);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum2);

    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 0);
    gl.colorMask(true, false, false, true);
    gl.uniform4fv(shProgram.iColor, colorPolygon);

    gl.bindBuffer(gl.ARRAY_BUFFER, surface.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    surface.Draw();
    gl.uniform4fv(shProgram.iColor, colorEdge);
    surface.DrawWireframe();

    // The SECOND PASS (for the right eye)
    gl.clear(gl.DEPTH_BUFFER_BIT);
    let matrRightFrustum = stereoCam.calcRightFrustum();
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, matrRightFrustum);
    let translateRightEye = m4.translation(-stereoCam.eyeSeparation / 2, 0, 0);
    matAccum0 = m4.multiply(rotateToPointZero, modelView);
    matAccum1 = m4.multiply(translateRightEye, matAccum0);
    matAccum2 = m4.multiply(translateToPointZero, matAccum1);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum2);

    gl.colorMask(false, true, true, true);
    gl.uniform4fv(shProgram.iColor, colorPolygon);

    gl.bindBuffer(gl.ARRAY_BUFFER, surface.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    surface.Draw();
    gl.uniform4fv(shProgram.iColor, colorEdge);
    surface.DrawWireframe();

    // RESET specific params to their default state

    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.colorMask(true, true, true, true);
}

function setupSliders(onChangeCallback) {
    const sliderPairs = [
        { sliderId: "uSlider", inputId: "uValue" },
        { sliderId: "vSlider", inputId: "vValue" },
        { sliderId: "eyeSeparationSlider", inputId: "eyeSeparationValue" },
        { sliderId: "fieldOfViewAngleSlider", inputId: "fieldOfViewAngleValue" },
        { sliderId: "nearClippingDistanceSlider", inputId: "nearClippingDistanceValue" },
        { sliderId: "convergenceDistanceSlider", inputId: "convergenceDistanceValue" }
    ];

    sliderPairs.forEach(({ sliderId, inputId }) => {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);

        if (slider && input) {
            // console.log(`Binding slider ${sliderId} and input ${inputId}`);
            linkSliderAndInput(slider, input);
        } else {
            console.warn(`Missing element: ${sliderId} or ${inputId}`);
        }
    });

    function linkSliderAndInput(slider, input) {
        // 1. Slider -> input
        slider.addEventListener("input", () => {
            input.value = slider.value;
            onChangeCallback();
        });

        // 2. Input -> slider (while editing, just updating value)
        input.addEventListener("input", () => {
            slider.value = input.value;
            onChangeCallback(); // update scene during input in value box
        });

        // 3. When finished editing (blur) — normalisation
        input.addEventListener("blur", () => {
            let val = parseFloat(input.value);
            const min = parseFloat(input.min || slider.min);
            const max = parseFloat(input.max || slider.max);

            if (isNaN(val)) val = min;
            if (val < min) val = min;
            if (val > max) val = max;

            input.value = val;
            slider.value = val;
            onChangeCallback();
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                input.blur(); // Trigger blur
            }
        });
    }
}

// Change parameters of visualisation due to the sliders and value boxes
function rebuildSurface() {
    // Update an analytical surface geometry
    let data = {};
    CreateSurfaceData(data);
    surface.BufferData(data.verticesF32, data.indicesU16);

    // Update stereo camera parameters
    const eyeSeparation = parseFloat(document.getElementById("eyeSeparationSlider")?.value || defaultStereoCamera.eyeSeparation);
    const convergence = parseFloat(document.getElementById("convergenceDistanceSlider")?.value || defaultStereoCamera.convergenceDistance);
    const fieldOfView = parseFloat(document.getElementById("fieldOfViewAngleSlider")?.value || deg2rad(defaultStereoCamera.fieldOfViewAngle));
    const nearClipping = parseFloat(document.getElementById("nearClippingDistanceSlider")?.value || defaultStereoCamera.nearClippingDistance);

    stereoCam.eyeSeparation = eyeSeparation;
    stereoCam.convergence = convergence;
    stereoCam.FOV = deg2rad(fieldOfView);
    stereoCam.nearClippingDistance = nearClipping;
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTexCoord = gl.getAttribLocation(prog, "texCoord");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iTexture = gl.getUniformLocation(prog, "uTexture");
    shProgram.iUseTexture = gl.getUniformLocation(prog, "useTexture");

    let data = {};
    CreateSurfaceData(data);
    surface = new Model('Surface');
    surface.BufferData(data.verticesF32, data.indicesU16);

    // TODO: This code loads two triangle geomtery
    let webcamData = {};
    CreateSurfaceData(webcamData, true);
    surfaceWebCam = new Model('SurfaceWebCam');
    surfaceWebCam.BufferData(webcamData.verticesF32, webcamData.indicesU16, webcamData.texCoordsF32);

    stereoCam = new StereoCamera(
        0.18,        // decimeters - eyeSeparation
        20.0,        // decimeters - convergence
        defaultStereoCamera.aspectRatio, // aspect ratio of canvas
        deg2rad(22), // radians - FOV
        8.0,         // decimeters - nearClippingDistance
        defaultStereoCamera.farClippingDistance // decimeters
    );

    gl.enable(gl.DEPTH_TEST);

    setupSliders(rebuildSurface);

    // Set initial values from defaultStereoCamera
    document.getElementById("eyeSeparationSlider").value = defaultStereoCamera.eyeSeparation;
    document.getElementById("eyeSeparationValue").value = defaultStereoCamera.eyeSeparation;

    document.getElementById("convergenceDistanceSlider").value = defaultStereoCamera.convergenceDistance;
    document.getElementById("convergenceDistanceValue").value = defaultStereoCamera.convergenceDistance;

    document.getElementById("fieldOfViewAngleSlider").value = defaultStereoCamera.fieldOfViewAngle;
    document.getElementById("fieldOfViewAngleValue").value = defaultStereoCamera.fieldOfViewAngle;

    document.getElementById("nearClippingDistanceSlider").value = defaultStereoCamera.nearClippingDistance;
    document.getElementById("nearClippingDistanceValue").value = defaultStereoCamera.nearClippingDistance;

    // Apply initial values to geometry and stereo camera
    rebuildSurface();
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }

    try {
        initGL();  // initialize the WebGL graphics context
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    video = document.createElement('video');
    video.autoplay = true;

    // Connect to video stream
    //let constraints = { video: true };
    let constraints = {
        video: {
            width: { ideal: 800 },
            height: { ideal: 600 },
            frameRate: { ideal: 30, max: 30 }
        }
    };

    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        video.srcObject = stream;

        let track = stream.getVideoTracks()[0];
        let settings = track.getSettings();

        console.log("Video track settings:", settings);

        iTextureWebCam = CreateWebCamTexture(settings.width, settings.height);

        video.play().catch(function (err) {
            console.error("Error playing video:", err);
        });
    }).catch(function (err) {
        console.error("Error accessing webcam: " + err.name + ": " + err.message);
    });

    // setInterval(draw, 1 / 20);
    setInterval(draw, 1000 / 30);

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}