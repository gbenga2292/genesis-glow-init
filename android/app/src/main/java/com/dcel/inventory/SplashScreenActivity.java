package com.dcel.inventory;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.view.animation.AnimationSet;
import android.view.animation.TranslateAnimation;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.dcel.inventory.R;

public class SplashScreenActivity extends AppCompatActivity {
    private ImageView logo;
    private ProgressBar progressBar;
    private TextView appName;
    private static final int SPLASH_DURATION = 2500; // 2.5 seconds

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        // Initialize UI elements
        logo = findViewById(R.id.splash_logo);
        progressBar = findViewById(R.id.splash_progress);
        appName = findViewById(R.id.splash_app_name);

        // Start animations
        animateLogo();
        animateAppName();

        // Navigate to MainActivity after splash duration
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            Intent intent = new Intent(SplashScreenActivity.this, MainActivity.class);
            startActivity(intent);
            finish();
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
        }, SPLASH_DURATION);
    }

    private void animateLogo() {
        // Fade in animation
        AlphaAnimation fadeIn = new AlphaAnimation(0.0f, 1.0f);
        fadeIn.setDuration(800);
        fadeIn.setStartOffset(200);

        // Scale animation (subtle zoom)
        android.view.animation.ScaleAnimation scale = new android.view.animation.ScaleAnimation(
            0.8f, 1.0f,
            0.8f, 1.0f,
            Animation.RELATIVE_TO_SELF, 0.5f,
            Animation.RELATIVE_TO_SELF, 0.5f
        );
        scale.setDuration(1000);
        scale.setStartOffset(200);

        // Combine animations
        AnimationSet animationSet = new AnimationSet(true);
        animationSet.addAnimation(fadeIn);
        animationSet.addAnimation(scale);

        logo.startAnimation(animationSet);
    }

    private void animateAppName() {
        // Fade in animation
        AlphaAnimation fadeIn = new AlphaAnimation(0.0f, 1.0f);
        fadeIn.setDuration(800);
        fadeIn.setStartOffset(1000);

        // Slide up animation
        TranslateAnimation slideUp = new TranslateAnimation(
            0, 0,
            100, 0
        );
        slideUp.setDuration(800);
        slideUp.setStartOffset(1000);

        // Combine animations
        AnimationSet animationSet = new AnimationSet(true);
        animationSet.addAnimation(fadeIn);
        animationSet.addAnimation(slideUp);

        appName.startAnimation(animationSet);
    }
}
