package com.pluggd.mobile

// JVM fixtures, not Android platform implementations. The verifier emits
// the actual CNG MainActivity, removing imports only, beside this harness.
// Model the RN 0.81 / Expo readiness and async-JS-default contracts without
// claiming device, predictive animation, or framework lifecycle acceptance.
object Build {
  object VERSION { var SDK_INT = 35 }
  object VERSION_CODES { const val R = 30 }
}
class Bundle
object R { object style { const val AppTheme = 1 } }
object BuildConfig { const val IS_NEW_ARCHITECTURE_ENABLED = true }
const val fabricEnabled = true
open class ReactActivityDelegate
open class DefaultReactActivityDelegate(activity: ReactActivity, name: String, fabric: Boolean) : ReactActivityDelegate()
class ReactActivityDelegateWrapper(activity: ReactActivity, architecture: Boolean, delegate: ReactActivityDelegate) : ReactActivityDelegate()

abstract class OnBackPressedCallback(var isEnabled: Boolean) {
  abstract fun handleOnBackPressed()
}
class Dispatcher(private val fallback: () -> Unit) {
  val callbacks = mutableListOf<Pair<ReactActivity, OnBackPressedCallback>>()
  var depth = 0
  fun addCallback(owner: ReactActivity, callback: OnBackPressedCallback) { callbacks.add(owner to callback) }
  fun activeCount() = callbacks.count { (owner, callback) -> owner.started && !owner.isDestroyed && callback.isEnabled }
  fun onBackPressed() {
    check(++depth < 8) { "recursive dispatcher / hardwareBackPress loop" }
    try {
      val active = callbacks.lastOrNull { (owner, callback) -> owner.started && !owner.isDestroyed && callback.isEnabled }
      if (active == null) fallback() else active.second.handleOnBackPressed()
    } finally { depth-- }
  }
}

open class ReactActivity {
  var targetSdk = 36
  var started = true
  var isFinishing = false
  var isDestroyed = false
  var loadAppReady = true
  var hostInitialized = true
  var mode = "consume"
  var jsEvents = 0
  var nativeDefaults = 0
  var taskMoves = 0
  var root = true
  var finishOnDefault = false
  var defaultThrows = false
  val delayedDefaults = mutableListOf<() -> Unit>()
  val onBackPressedDispatcher = Dispatcher {
    nativeDefaults++
    if (defaultThrows) error("native default fixture error")
    if (finishOnDefault) isFinishing = true else started = false
  }
  private val rnCallback = object : OnBackPressedCallback(true) {
    override fun handleOnBackPressed() {
      isEnabled = false
      onBackPressed()
      isEnabled = true
    }
  }
  open fun onCreate(savedInstanceState: Bundle?) {
    if (Build.VERSION.SDK_INT >= 36 && targetSdk >= 36) {
      onBackPressedDispatcher.addCallback(this, rnCallback)
    }
  }
  open fun getMainComponentName(): String = "main"
  @get:JvmName("fixtureMainComponentName")
  val mainComponentName get() = getMainComponentName()
  open fun createReactActivityDelegate() = ReactActivityDelegate()
  fun setTheme(theme: Int) {}
  fun moveTaskToBack(nonRoot: Boolean): Boolean {
    taskMoves++
    if (root) started = false
    return root
  }
  open fun onBackPressed() {
    // Expo's not-ready wrapper returns false => ReactActivity default.
    if (!loadAppReady) { onBackPressedDispatcher.onBackPressed(); return }
    // Bridgeless ReactDelegate returns true with a host, even when its
    // uninitialized instance emits no JS event. Do not invent a fallback.
    if (!hostInitialized) return
    jsEvents++
    when (mode) {
      "consume" -> Unit
      "defer" -> delayedDefaults.add { invokeDefaultOnBackPressed() }
      "sync-default" -> invokeDefaultOnBackPressed()
      "throw" -> error("delegate fixture error")
      "destroy" -> { isDestroyed = true; started = false }
      "finish" -> isFinishing = true
      else -> error("unknown fixture mode")
    }
  }
  open fun invokeDefaultOnBackPressed() {
    // Real RN disables only its own private callback before redispatch.
    rnCallback.isEnabled = false
    onBackPressedDispatcher.onBackPressed()
  }
  fun systemBack() {
    if (Build.VERSION.SDK_INT <= 32) onBackPressed() else onBackPressedDispatcher.onBackPressed()
  }
  fun drainDefault() {
    check(delayedDefaults.size == 1) { "expected exactly one asynchronous JS default" }
    delayedDefaults.removeAt(0).invoke()
    check(delayedDefaults.isEmpty()) { "native default incorrectly re-emitted hardwareBackPress" }
  }
}

private var assertions = 0
private fun expect(condition: Boolean, message: String) { assertions++; check(condition) { message } }
private fun activity(api: Int, mode: String = "consume") = MainActivity().also {
  Build.VERSION.SDK_INT = api
  it.mode = mode
  it.onCreate(null)
}
private fun bridge(activity: MainActivity) = activity.onBackPressedDispatcher.callbacks.single().second

fun main() {
  for (api in listOf(24, 30, 32, 33, 35, 36)) {
    val app = activity(api)
    expect(app.onBackPressedDispatcher.callbacks.size == if (api >= 33) 1 else 0, "API$api callback boundary")
    app.systemBack()
    expect(app.jsEvents == 1 && app.nativeDefaults == 0, "API$api consumed JS Back must not exit")
    if (api >= 33) expect(bridge(app).isEnabled, "API$api callback should remain enabled")
  }
  // API36 belongs to RN, including its target-sdk condition; our CNG bridge
  // deliberately adds no callback when RN does not qualify on this API.
  val api36OldTarget = MainActivity().also { Build.VERSION.SDK_INT = 36; it.targetSdk = 35; it.onCreate(null) }
  expect(api36OldTarget.onBackPressedDispatcher.callbacks.isEmpty(), "do not replace RN API36 guard")

  for (api in listOf(33, 34, 35)) {
    val app = activity(api)
    repeat(3) { app.systemBack() }
    expect(app.jsEvents == 3 && app.nativeDefaults == 0, "API$api repeated JS-consumed Back")
    app.started = false
    expect(app.onBackPressedDispatcher.activeCount() == 0, "API$api stop detaches lifecycle-owned callback")
    app.started = true
    expect(app.onBackPressedDispatcher.activeCount() == 1, "API$api resume reattaches same callback")
    app.systemBack()
    expect(app.jsEvents == 4, "API$api resumed Back must reach JS")

    val delayed = activity(api, "defer")
    delayed.systemBack()
    expect(delayed.jsEvents == 1 && delayed.nativeDefaults == 0 && bridge(delayed).isEnabled, "API$api JS default really remains asynchronous")
    delayed.drainDefault()
    expect(delayed.jsEvents == 1 && delayed.nativeDefaults == 1, "API$api delayed default exactly once without recursion")
    expect(bridge(delayed).isEnabled && !delayed.started, "API$api live root background preserves enabled state")
    delayed.started = true
    delayed.systemBack()
    delayed.drainDefault()
    expect(delayed.jsEvents == 2 && delayed.nativeDefaults == 2, "API$api repeat after root resume")

    val finishing = activity(api, "defer")
    finishing.finishOnDefault = true
    finishing.systemBack()
    finishing.drainDefault()
    expect(finishing.nativeDefaults == 1 && !bridge(finishing).isEnabled, "API$api finishing Activity must not re-enable callback")
    val destroyedWhileQueued = activity(api, "defer")
    destroyedWhileQueued.systemBack()
    destroyedWhileQueued.isDestroyed = true
    destroyedWhileQueued.started = false
    destroyedWhileQueued.drainDefault()
    expect(destroyedWhileQueued.nativeDefaults == 1 && !bridge(destroyedWhileQueued).isEnabled, "API$api destroyed Activity must not re-enable after delayed native default")

    val synchronous = activity(api, "sync-default")
    synchronous.systemBack()
    expect(synchronous.jsEvents == 1 && synchronous.nativeDefaults == 1 && bridge(synchronous).isEnabled, "API$api synchronous fallback preserves both nested prior states")

    val disabled = activity(api)
    bridge(disabled).isEnabled = false
    disabled.invokeDefaultOnBackPressed()
    expect(!bridge(disabled).isEnabled && disabled.nativeDefaults == 1, "API$api do not enable previously disabled callback")
    val disabledThrowing = activity(api)
    bridge(disabledThrowing).isEnabled = false
    disabledThrowing.defaultThrows = true
    expect(runCatching { disabledThrowing.invokeDefaultOnBackPressed() }.isFailure, "API$api preserve disabled native exception")
    expect(!bridge(disabledThrowing).isEnabled, "API$api exception must preserve disabled prior state")

    val throwing = activity(api, "throw")
    expect(runCatching { throwing.systemBack() }.isFailure, "API$api preserve delegate exception")
    expect(bridge(throwing).isEnabled, "API$api delegate exception restores live prior state")
    val throwingDefault = activity(api)
    throwingDefault.defaultThrows = true
    expect(runCatching { throwingDefault.invokeDefaultOnBackPressed() }.isFailure, "API$api preserve native exception")
    expect(bridge(throwingDefault).isEnabled, "API$api native exception restores live prior state")

    for (mode in listOf("destroy", "finish")) {
      val dead = activity(api, mode)
      dead.systemBack()
      expect(!bridge(dead).isEnabled, "API$api $mode must not re-enable callback")
      if (mode == "destroy") expect(dead.onBackPressedDispatcher.activeCount() == 0, "API$api destroy removes lifecycle callback")
    }
    val notReady = activity(api).also { it.loadAppReady = false }
    notReady.systemBack()
    expect(notReady.jsEvents == 0 && notReady.nativeDefaults == 1, "API$api Expo not-ready delegate retains native fallback")
    val uninitialized = activity(api).also { it.hostInitialized = false }
    uninitialized.systemBack()
    expect(uninitialized.jsEvents == 0 && uninitialized.nativeDefaults == 0, "API$api do not invent RN host startup fallback")
  }

  for (api in listOf(24, 30)) {
    for (root in listOf(true, false)) {
      val app = activity(api, "defer").also { it.root = root }
      app.systemBack()
      app.drainDefault()
      expect(app.taskMoves == 1 && app.nativeDefaults == if (root) 0 else 1, "API$api unchanged <=R moveTaskToBack(root=$root) body")
    }
  }
  for (api in listOf(32, 36)) {
    val app = activity(api, "defer")
    app.systemBack()
    app.drainDefault()
    expect(app.taskMoves == 0 && app.nativeDefaults == 1 && app.jsEvents == 1, "API$api unchanged default branch")
  }
  println("Actual generated Kotlin Back callback/default behavior: PASS ($assertions assertions; mocked RN/AndroidX lifecycle, not a device or gesture test)")
}
