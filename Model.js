function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function Vertex(p) {
    this.p = p;
    this.normal = [];
    this.triangles = [];
}

function Triangle(v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = [];
    this.tangent = [];
}

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.iTexCoordBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, indices, texCoords) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        if (texCoords) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STREAM_DRAW);
            gl.vertexAttribPointer(shProgram.iAttribTexCoord, 2, gl.FLOAT, false, 0, 0);
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STREAM_DRAW);

        this.count = indices.length; // Ensure count is set to number of indices
    }

    this.Draw = function () {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer); // Explicitly bind index buffer
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }

    this.DrawWireframe = function () {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer); // Explicitly bind index buffer
        for (let p = 0; p < this.count; p += 3)
            gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, p * 2);
    }
}

function CreateSurfaceData(data, isWebcam = false) {
    if (isWebcam) {
        // Create a simple quad for the webcam surface
        data.verticesF32 = new Float32Array([
            -1, -1, 0,  // Bottom-left
            1, -1, 0,  // Bottom-right
            1, 1, 0,  // Top-right
            -1, 1, 0   // Top-left
        ]);

        data.texCoordsF32 = new Float32Array([
            0, 1,  // Bottom-left
            1, 1,  // Bottom-right
            1, 0,  // Top-right
            0, 0   // Top-left

            // 0, 0,  // Bottom-left
            // 1, 0,  // Bottom-right
            // 1, 1,  // Top-right
            // 0, 1   // Top-left
        ]);

        data.indicesU16 = new Uint16Array([
            0, 1, 2,  // First triangle
            0, 2, 3   // Second triangle
        ]);
    } else {
        // Analytical surface creation
        let vCount = parseInt(vSlider.value);
        let uCount = parseInt(uSlider.value);

        let vDegMin = -90, vDegMax = 90;
        let uDegMin = 0, uDegMax = 360;
        let stepV = (vDegMax - vDegMin) / vCount;
        let stepU = (uDegMax - uDegMin) / uCount;

        let vAngles = Array.from({ length: vCount + 1 },
            (_, i) => deg2rad(vDegMin + i * stepV));
        let uAngles = Array.from({ length: uCount + 1 },
            (_, j) => deg2rad(uDegMin + j * stepU));

        let R = 1.0;
        let a = 0.24;
        let n = 3;

        let vertexGrid = vAngles.map(vRad => {
            return uAngles.map(uRad => {
                let radial = R * Math.cos(vRad) + a * (1 - Math.sin(vRad)) * Math.abs(Math.cos(n * uRad));
                let x = radial * Math.cos(uRad);
                let y = radial * Math.sin(uRad);
                let z = R * Math.sin(vRad);
                return new Vertex([x, y, z]);
            });
        });

        let vertices = vertexGrid.flat();

        function indexOf(iv, iu) {
            return iv * (uCount + 1) + iu;
        }

        let triangles = [];
        for (let iv = 0; iv < vCount; iv++) {
            for (let iu = 0; iu < uCount; iu++) {
                let i0 = indexOf(iv, iu);
                let i1 = indexOf(iv, iu + 1);
                let i2 = indexOf(iv + 1, iu);
                let i3 = indexOf(iv + 1, iu + 1);

                let t1 = new Triangle(i0, i2, i1);
                let t1Index = triangles.length;
                triangles.push(t1);
                vertices[i0].triangles.push(t1Index);
                vertices[i2].triangles.push(t1Index);
                vertices[i1].triangles.push(t1Index);

                let t2 = new Triangle(i1, i2, i3);
                let t2Index = triangles.length;
                triangles.push(t2);
                vertices[i1].triangles.push(t2Index);
                vertices[i2].triangles.push(t2Index);
                vertices[i3].triangles.push(t2Index);
            }
        }

        data.verticesF32 = new Float32Array(vertices.length * 3);
        for (let i = 0; i < vertices.length; i++) {
            data.verticesF32[i * 3 + 0] = vertices[i].p[0];
            data.verticesF32[i * 3 + 1] = vertices[i].p[1];
            data.verticesF32[i * 3 + 2] = vertices[i].p[2];
        }

        data.indicesU16 = new Uint16Array(triangles.length * 3);
        for (let i = 0; i < triangles.length; i++) {
            data.indicesU16[i * 3 + 0] = triangles[i].v0;
            data.indicesU16[i * 3 + 1] = triangles[i].v1;
            data.indicesU16[i * 3 + 2] = triangles[i].v2;
        }
    }
}