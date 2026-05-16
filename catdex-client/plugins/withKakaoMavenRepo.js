const { withProjectBuildGradle } = require("@expo/config-plugins");

const KAKAO_MAVEN_REPO = "maven { url 'https://devrepo.kakao.com/nexus/content/groups/public/' }";

function addKakaoMavenRepo(buildGradle) {
  if (buildGradle.includes("devrepo.kakao.com/nexus/content/groups/public")) {
    return buildGradle;
  }

  return buildGradle.replace(
    /allprojects\s*\{\s*repositories\s*\{\s*google\(\)\s*mavenCentral\(\)/,
    (match) => `${match}\n    ${KAKAO_MAVEN_REPO}`,
  );
}

module.exports = function withKakaoMavenRepo(config) {
  return withProjectBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = addKakaoMavenRepo(gradleConfig.modResults.contents);
    return gradleConfig;
  });
};
