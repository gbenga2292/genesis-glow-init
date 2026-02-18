# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

-dontusemixedcaseclassnames
-verbose

# Keep line numbers for stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep Capacitor API
-keep public class com.getcapacitor.** { *; }
-keep public interface com.getcapacitor.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Keep data classes
-keepclassmembers class * {
    *** get*();
    void set*(...);
}

# Remove logging in release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Common Android patterns
-keepnames class * extends android.view.View
-keepnames class * extends android.app.Fragment
-keepnames class * extends androidx.fragment.app.Fragment
-keepnames class * implements android.os.Parcelable

# Optimization
-optimizationpasses 5
-repackageclasses
-allowaccessmodification
#-renamesourcefileattribute SourceFile
