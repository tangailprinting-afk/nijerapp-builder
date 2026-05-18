package com.webapp.engine;

import android.app.Application;

import com.onesignal.OneSignal;

public class MyApplication
extends Application {

    @Override
    public void onCreate() {

        super.onCreate();

        OneSignal.initialize(

            this,

"cf9a26bb-42ee-439b-a8d1-bb3ca6ca6d06"

        );

        OneSignal.getNotifications()
            .requestPermission(false);

    }

}