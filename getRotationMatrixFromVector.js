/**
 * Converts a rotation vector (quaternion) into a rotation matrix.
 *
 * This function takes a rotation vector (presumably from a ROTATION_VECTOR sensor), typically derived from a device's rotation sensor,
 * and converts it into either a 3x3 (9-element) or 4x4 (16-element) rotation matrix.
 *
 * The rotation vector is expected to contain the quaternion components [x, y, z, w].
 * If the `w` component (q0) is not provided (i.e., vector length < 4), it will be
 * calculated assuming a unit quaternion.
 *
 * - If `matrixSize` is 9, the resulting 3x3 matrix is returned in row-major order:
 *   [ R[0], R[1], R[2],
 *     R[3], R[4], R[5],
 *     R[6], R[7], R[8] ]
 *
 * - If `matrixSize` is 16, the resulting 4x4 matrix is returned in row-major order with the last row and column
 *   forming the identity matrix's extension:
 *   [ R[0],  R[1],  R[2],  0,
 *     R[4],  R[5],  R[6],  0,
 *     R[8],  R[9],  R[10], 0,
 *     0,     0,     0,     1 ]
 *
 * @param {number[]} rotationVector - The rotation vector [x, y, z, (optional) w] to convert.
 * @param {number} [matrixSize=16] - Desired size of the output matrix (9 or 16). Defaults to 16.
 * @returns {Float32Array} The resulting rotation matrix as a Float32Array of the specified size.
 */

function getRotationMatrixFromVector(rotationVector, matrixSize = 16) {
    const R = new Float32Array(matrixSize);
    let q0, q1 = rotationVector[0], q2 = rotationVector[1], q3 = rotationVector[2];

    if (rotationVector.length >= 4) {
        q0 = rotationVector[3];
    } else {
        q0 = 1 - q1 * q1 - q2 * q2 - q3 * q3;
        q0 = (q0 > 0) ? Math.sqrt(q0) : 0;
    }

    const sq_q1 = 2 * q1 * q1;
    const sq_q2 = 2 * q2 * q2;
    const sq_q3 = 2 * q3 * q3;
    const q1_q2 = 2 * q1 * q2;
    const q3_q0 = 2 * q3 * q0;
    const q1_q3 = 2 * q1 * q3;
    const q2_q0 = 2 * q2 * q0;
    const q2_q3 = 2 * q2 * q3;
    const q1_q0 = 2 * q1 * q0;

    if (matrixSize === 9) {
        R[0] = 1 - sq_q2 - sq_q3;
        R[1] = q1_q2 - q3_q0;
        R[2] = q1_q3 + q2_q0;
        R[3] = q1_q2 + q3_q0;
        R[4] = 1 - sq_q1 - sq_q3;
        R[5] = q2_q3 - q1_q0;
        R[6] = q1_q3 - q2_q0;
        R[7] = q2_q3 + q1_q0;
        R[8] = 1 - sq_q1 - sq_q2;
    } else {
        R[0] = 1 - sq_q2 - sq_q3;
        R[1] = q1_q2 - q3_q0;
        R[2] = q1_q3 + q2_q0;
        R[3] = 0.0;
        R[4] = q1_q2 + q3_q0;
        R[5] = 1 - sq_q1 - sq_q3;
        R[6] = q2_q3 - q1_q0;
        R[7] = 0.0;
        R[8] = q1_q3 - q2_q0;
        R[9] = q2_q3 + q1_q0;
        R[10] = 1 - sq_q1 - sq_q2;
        R[11] = 0.0;
        R[12] = 0.0;
        R[13] = 0.0;
        R[14] = 0.0;
        R[15] = 1.0;
    }

    return R;
}
