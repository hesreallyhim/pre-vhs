module.exports = function fixturePack(engine) {
  const { formatType } = engine.helpers;
  const suffix =
    engine.options && engine.options.suffix ? engine.options.suffix : "";

  engine.registerMacros(
    {
      FixtureEcho(payload = "") {
        const spacer = payload ? " " : "";
        return [formatType(`fixture${suffix}${spacer}${payload}`)];
      },
    },
    { packName: "fixture" },
  );
};
