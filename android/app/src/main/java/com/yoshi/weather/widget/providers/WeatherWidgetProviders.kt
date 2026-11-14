package com.yoshi.weather.widget.providers

import android.content.Context
import android.widget.RemoteViews
import com.yoshi.weather.widget.WeatherHomeWidgetProvider
import com.yoshi.weather.widget.WidgetBinders
import com.yoshi.weather.widget.WidgetBundle

/** Thin [WeatherHomeWidgetProvider] subclasses mapped to [WidgetBinders]. */
class WidgetMaterialYouForecast1x1Provider : WeatherHomeWidgetProvider() {
    override fun buildViews(context: Context, bundle: WidgetBundle): RemoteViews =
        WidgetBinders.materialYouForecast1x1(context, bundle)
}

class WidgetMaterialYouCurrentProvider : WeatherHomeWidgetProvider() {
    override fun buildViews(context: Context, bundle: WidgetBundle): RemoteViews =
        WidgetBinders.materialYouCurrent(context, bundle)
}

class WidgetClockDayHorizontalProvider : WeatherHomeWidgetProvider() {
    override fun buildViews(context: Context, bundle: WidgetBundle): RemoteViews =
        WidgetBinders.clockHorizontal(context, bundle)
}
