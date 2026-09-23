/**
 * Sustituto del módulo nativo ExpoFetchModule, solo para Jest.
 *
 * Por qué existe: jest-expo localiza los mocks nativos leyendo las trazas de pila, y la carpeta
 * "Car Wash 505 (2)" tiene paréntesis que rompen ese análisis ("path ... Received null").
 * Si la carpeta se renombra sin paréntesis, este archivo y su entrada en package.json → jest.moduleNameMapper
 * pueden borrarse.
 */
module.exports = {
  ExpoFetchModule: {
    NativeRequest: class NativeRequest {},
    NativeResponse: class NativeResponse {},
    unstable_createBlobData: async () => "",
  },
};
