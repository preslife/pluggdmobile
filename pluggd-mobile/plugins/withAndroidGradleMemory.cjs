const { withGradleProperties } = require('@expo/config-plugins');

const GRADLE_JVM_ARGS = '-Xmx6g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8';

module.exports = function withAndroidGradleMemory(config) {
  return withGradleProperties(config, (modConfig) => {
    modConfig.modResults = modConfig.modResults.filter(
      (entry) => entry.type !== 'property' || entry.key !== 'org.gradle.jvmargs',
    );
    modConfig.modResults.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: GRADLE_JVM_ARGS,
    });
    return modConfig;
  });
};
