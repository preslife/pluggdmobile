const { withMainActivity } = require('@expo/config-plugins');

// RN 0.81 registers its AndroidX Back callback only on API/target 36. Keep
// that callback, Expo's delegate and the SDK54 legacy default body intact.
const TAG = 'pluggd-android-react-back';
const DEFAULT_BODY = `      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()`;
const DEFAULT_METHOD = `  override fun invokeDefaultOnBackPressed() {
${DEFAULT_BODY}
  }`;
const block = (name, contents, indent = '') =>
  `${indent}// @generated begin ${TAG}-${name}\n${contents}\n${indent}// @generated end ${TAG}-${name}`;
const IMPORT = block('import', 'import androidx.activity.OnBackPressedCallback');
const FIELD = block('callback', `  private var pluggdReactBackCallback: OnBackPressedCallback? = null`, '  ');
const REGISTER = block('register', `    // API36 retains RN's own callback; API24–32 retain the legacy path.
    if (Build.VERSION.SDK_INT in 33..35) {
      val callback = object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          val wasEnabled = isEnabled
          isEnabled = false
          try {
            // Go through ReactActivity and Expo's delegate, not a JS shortcut.
            this@MainActivity.onBackPressed()
          } finally {
            if (!isFinishing && !isDestroyed) isEnabled = wasEnabled
          }
        }
      }
      pluggdReactBackCallback = callback
      onBackPressedDispatcher.addCallback(this, callback)
    }`, '    ');
const DEFAULT_WRAPPER = block('default', `  override fun invokeDefaultOnBackPressed() {
    // JS may request native default asynchronously, after the first handler
    // has re-enabled our callback. RN disables only its private callback.
    val callback = pluggdReactBackCallback
    val wasEnabled = callback?.isEnabled ?: false
    callback?.isEnabled = false
    try {
${DEFAULT_BODY.split('\n').map((line) => line ? `  ${line}` : line).join('\n')}
    } finally {
      if (!isFinishing && !isDestroyed) callback?.isEnabled = wasEnabled
    }
  }`, '  ');
const REPLACEMENTS = [
  ['import android.os.Bundle', `import android.os.Bundle\n\n${IMPORT}`],
  ['class MainActivity : ReactActivity() {', `class MainActivity : ReactActivity() {\n${FIELD}`],
  ['    super.onCreate(null)', `    super.onCreate(null)\n${REGISTER}`],
  [DEFAULT_METHOD, DEFAULT_WRAPPER],
];

function replaceExactlyOnce(source, before, after) {
  if (source.split(before).length !== 2) {
    throw new Error(`withAndroidReactBackBridge: expected one SDK54 Kotlin anchor: ${before.split('\n')[0]}`);
  }
  return source.replace(before, after);
}

function transform(contents) {
  if (contents.includes('\r')) {
    throw new Error('withAndroidReactBackBridge: expected the SDK54 LF Kotlin template');
  }
  const generated = contents.includes(TAG);
  let original = contents;
  if (generated) {
    // Never accept a partial or modified bridge as an idempotent success.
    for (const [before, after] of [...REPLACEMENTS].reverse()) {
      original = replaceExactlyOnce(original, after, before);
    }
    if (original.includes(TAG)) {
      throw new Error('withAndroidReactBackBridge: unexpected generated bridge marker');
    }
  }
  if ((original.match(/override fun onCreate\(/g) || []).length !== 1
      || (original.match(/override fun invokeDefaultOnBackPressed\(/g) || []).length !== 1
      || /pluggdReactBackCallback|OnBackPressedCallback|onBackPressedDispatcher|override fun onBackPressed\(/.test(original)) {
    throw new Error('withAndroidReactBackBridge: unexpected existing MainActivity Back customization');
  }
  let result = original;
  for (const [before, after] of REPLACEMENTS) {
    result = replaceExactlyOnce(result, before, after);
  }
  if (generated && result !== contents) {
    throw new Error('withAndroidReactBackBridge: generated bridge did not round-trip');
  }
  return result;
}

module.exports = function withAndroidReactBackBridge(config) {
  return withMainActivity(config, (modConfig) => {
    if (modConfig.modResults.language !== 'kt') {
      throw new Error('withAndroidReactBackBridge: only the SDK54 Kotlin MainActivity is supported');
    }
    modConfig.modResults.contents = transform(modConfig.modResults.contents);
    return modConfig;
  });
};
