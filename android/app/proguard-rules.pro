# ==============================================================================
# BASE REACT NATIVE & CORE LIBS
# ==============================================================================
-keep class com.facebook.react.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class com.facebook.stacktrace.** { *; }
-keepattributes Signature, *Annotation*, InnerClasses
-dontwarn com.facebook.react.**
-dontwarn javax.annotation.**

# ==============================================================================
# RAZORPAY (CRITICAL FOR PAYMENTS)
# ==============================================================================
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** {*;}
-optimizations !method/inlining/
-keepclasseswithmembers class * {
  public void onPayment*(...);
}

# ==============================================================================
# REANIMATED V4 & WORKLETS (CRITICAL FOR UI)
# ==============================================================================
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-dontwarn com.swmansion.reanimated.**
-dontwarn com.swmansion.worklets.**

# ==============================================================================
# VISION CAMERA V4
# ==============================================================================
-keep class com.mrousavy.camera.** { *; }
-dontwarn com.mrousavy.camera.**

# ==============================================================================
# NOTIFEE & NOTIFICATIONS
# ==============================================================================
-keep class io.invertase.notifee.** { *; }
-dontwarn io.invertase.notifee.**

# ==============================================================================
# PDF & HTML GENERATION (YOUR EXISTING RULES + UPDATES)
# ==============================================================================
-keep class com.tom_roush.pdfbox.** { *; }
-dontwarn com.tom_roush.pdfbox.**
-keep class com.gemalto.jp2.** { *; }
-dontwarn com.gemalto.jp2.**
-keep class com.christopherdro.htmltopdf.** { *; }

# ==============================================================================
# NETWORK & STORAGE
# ==============================================================================
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**