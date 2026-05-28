import { Group, BoxGeometry, SphereGeometry, MeshStandardMaterial, Mesh } from 'three';

export function createCharacter() {
  const group = new Group();

  const bodyMat = new MeshStandardMaterial({ color: 0x2196F3, roughness: 0.7, metalness: 0.0 });
  const skinMat = new MeshStandardMaterial({ color: 0xFFCC80, roughness: 0.6, metalness: 0.0 });
  const hairMat = new MeshStandardMaterial({ color: 0x3E2723, roughness: 0.8, metalness: 0.0 });
  const shoeMat = new MeshStandardMaterial({ color: 0x37474F, roughness: 0.7, metalness: 0.0 });
  const eyeMat  = new MeshStandardMaterial({ color: 0x212121, roughness: 0.4, metalness: 0.0 });
  const whiteMat = new MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.4, metalness: 0.0 });

  // Torso
  const torso = new Mesh(new BoxGeometry(0.8, 1, 0.5), bodyMat);
  torso.position.y = 1.1;
  torso.castShadow = true;
  group.add(torso);

  // Head
  const head = new Mesh(new SphereGeometry(0.3, 10, 8), skinMat);
  head.position.y = 1.95;
  head.castShadow = true;
  group.add(head);

  // Hair (cap)
  const hair = new Mesh(
    new SphereGeometry(0.32, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat
  );
  hair.position.y = 2.05;
  hair.castShadow = true;
  group.add(hair);

  // Eyes — white sclera + dark pupil
  const eyeGeo = new SphereGeometry(0.06, 6, 4);
  const pupilGeo = new SphereGeometry(0.035, 6, 4);

  const leftEyeWhite = new Mesh(eyeGeo, whiteMat);
  leftEyeWhite.position.set(-0.1, 1.98, 0.26);
  group.add(leftEyeWhite);

  const rightEyeWhite = new Mesh(eyeGeo, whiteMat);
  rightEyeWhite.position.set(0.1, 1.98, 0.26);
  group.add(rightEyeWhite);

  const leftPupil = new Mesh(pupilGeo, eyeMat);
  leftPupil.position.set(-0.1, 1.98, 0.30);
  group.add(leftPupil);

  const rightPupil = new Mesh(pupilGeo, eyeMat);
  rightPupil.position.set(0.1, 1.98, 0.30);
  group.add(rightPupil);

  // Arms — pivot at shoulder (top of arm)
  const armGeo = new BoxGeometry(0.25, 0.7, 0.25);
  armGeo.translate(0, -0.35, 0); // Pivot at top (shoulder joint)

  const leftArm = new Mesh(armGeo, skinMat);
  leftArm.position.set(-0.55, 1.45, 0); // Shoulder position
  leftArm.castShadow = true;
  group.add(leftArm);

  const rightArm = new Mesh(armGeo.clone(), skinMat);
  rightArm.position.set(0.55, 1.45, 0);
  rightArm.castShadow = true;
  group.add(rightArm);

  // Legs — pivot at hip (top of leg)
  const legGeo = new BoxGeometry(0.3, 0.7, 0.3);
  legGeo.translate(0, -0.35, 0); // Pivot at top (hip joint)

  const leftLeg = new Mesh(legGeo, shoeMat);
  leftLeg.position.set(-0.2, 0.7, 0); // Hip position
  leftLeg.castShadow = true;
  group.add(leftLeg);

  const rightLeg = new Mesh(legGeo.clone(), shoeMat);
  rightLeg.position.set(0.2, 0.7, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Store references for animation
  group.userData.leftLeg  = leftLeg;
  group.userData.rightLeg = rightLeg;
  group.userData.leftArm  = leftArm;
  group.userData.rightArm = rightArm;

  return group;
}
