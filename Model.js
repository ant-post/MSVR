function createCorrugatedSphereGeometry(uCount, vCount, R, a, n) {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    const vDegMin = -90, vDegMax = 90;
    const uDegMin = 0, uDegMax = 360;
    const stepV = (vDegMax - vDegMin) / vCount;
    const stepU = (uDegMax - uDegMin) / uCount;

    // Generate grid of vertices
    const vertexGrid = [];

    for (let iv = 0; iv <= vCount; iv++) {
        const vDeg = vDegMin + iv * stepV;
        const vRad = THREE.Math.degToRad(vDeg);
        const row = [];

        for (let iu = 0; iu <= uCount; iu++) {
            const uDeg = uDegMin + iu * stepU;
            const uRad = THREE.Math.degToRad(uDeg);

            const radial = R * Math.cos(vRad) + a * (1 - Math.sin(vRad)) * Math.abs(Math.cos(n * uRad));
            const x = radial * Math.cos(uRad);
            const y = radial * Math.sin(uRad);
            const z = R * Math.sin(vRad);

            vertices.push(x, y, z);
            row.push(vertices.length / 3 - 1); // index of current vertex
        }

        vertexGrid.push(row);
    }

    // Create triangles (indices)
    for (let iv = 0; iv < vCount; iv++) {
        for (let iu = 0; iu < uCount; iu++) {
            const i0 = vertexGrid[iv][iu];
            const i1 = vertexGrid[iv][iu + 1];
            const i2 = vertexGrid[iv + 1][iu];
            const i3 = vertexGrid[iv + 1][iu + 1];

            indices.push(i0, i2, i1);
            indices.push(i1, i2, i3);
        }
    }

    geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}
