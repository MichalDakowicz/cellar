package com.michaldakowicz.cellar

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.uimanager.ViewManager

class CellarPushModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "CellarPush"
  @ReactMethod fun configure(endpoint: String, device: String, secret: String, owner: String, promise: Promise) {
    CellarPush.io.execute {
      try { CellarPush.configure(context, endpoint, device, secret, owner); promise.resolve(null) }
      catch (e: Exception) { promise.reject("PUSH_CONFIG", e) }
    }
  }
  @ReactMethod fun clear(promise: Promise) {
    CellarPush.io.execute {
      try { CellarPush.clear(context) { promise.resolve(null) } } catch (e: Exception) { promise.reject("PUSH_CLEAR", e) }
    }
  }
}
class CellarPushPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext) = listOf(CellarPushModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
