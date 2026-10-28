import {
  createGLMatrix,
  createStarWars,
  createXAnalogTV,
  createBSOD,
  createPhosphor,
  createSonar
} from './matrixAndRetro.js';

import {
  createPipes3D,
  createBoing,
  createFlyingToasters,
  createGeodesicGears,
  createMaze3D,
  createMolecule
} from './threeDClassics.js';

import {
  createFlurry,
  createHyperspace,
  createMandelbrot,
  createGalaxy,
  createPyro
} from './shadersAndFractals.js';

import {
  createAttractors,
  createEpicycle,
  createGameOfLife,
  createRorschach,
  createMystify
} from './mathAndAutomata.js';

import { createChessOpenings } from './chessOpenings.js';
import { createBughouse3D } from './bughouse3d.js';
import { createSurface3D } from './functionPlotter3d.js';

const SAVER_FACTORIES = {
  glmatrix: createGLMatrix,
  starwars: createStarWars,
  xanalogtv: createXAnalogTV,
  bsod: createBSOD,
  phosphor: createPhosphor,
  sonar: createSonar,
  pipes3d: createPipes3D,
  boing: createBoing,
  flyingtoasters: createFlyingToasters,
  geodesicgears: createGeodesicGears,
  maze3d: createMaze3D,
  molecule: createMolecule,
  flurry: createFlurry,
  hyperspace: createHyperspace,
  mandelbrot: createMandelbrot,
  galaxy: createGalaxy,
  pyro: createPyro,
  attractors: createAttractors,
  epicycle: createEpicycle,
  gameoflife: createGameOfLife,
  rorschach: createRorschach,
  mystify: createMystify,
  chessopenings: createChessOpenings,
  bughouse3d: createBughouse3D,
  surface3d: createSurface3D
};

export function createSaverInstance(saverId, canvas, getParams, getTelemetry) {
  const cleanId = (saverId || 'glmatrix').replace(/^xss_/, '');
  const factory = SAVER_FACTORIES[cleanId] || SAVER_FACTORIES.glmatrix;
  return factory(canvas, getParams, getTelemetry);
}
