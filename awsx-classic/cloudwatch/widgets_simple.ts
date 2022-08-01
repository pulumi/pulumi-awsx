// Copyright 2016-2018, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// import * as config from "../config";
// import * as region from "../region";

import { MetricStatistic } from "./metric";
import { Widget } from "./widget";
import { AlarmAnnotation, WidgetAnnotation } from "./widgets_annotations";
import * as wjson from "./widgets_json";

import * as utils from "../utils";

export interface SimpleWidgetArgs {
    /**
     * The width of the widget in grid units (in a 24-column grid). The default is 6.
     *
     * Valid Values: 1–24
     */
    width?: number;

    /**
     * The height of the widget in grid units. The default is 6.
     *
     * Valid Values: 1–1000
     */
    height?: number;
}

/**
 * Base type of all non-flow Widgets to place in a DashboardGrid.
 */
export abstract class SimpleWidget implements Widget {
    constructor(private readonly args: SimpleWidgetArgs) {
        if (args.width !== undefined) {
            if (args.width < 1 || args.width > 24) {
                throw new Error("[args.width] must be between 1 and 24 (inclusive).");
            }
        }
        if (args.height !== undefined) {
            if (args.height < 1 || args.height > 1000) {
                throw new Error("[args.height] must be between 1 and 1000 (inclusive).");
            }
        }
    }

    public width() {
        return this.args.width !== undefined ? this.args.width : 6;
    }

    public height() {
        return this.args.height !== undefined ? this.args.height : 6;
    }

    /** @internal */
    protected abstract computeType(): wjson.WidgetJson["type"];
    /** @internal */
    protected abstract computeProperties(region: pulumi.Output<aws.Region>): wjson.WidgetJson["properties"];

    /** For internal use only. */
    public addWidgetJson(widgetJsons: wjson.WidgetJson[], xOffset: number, yOffset: number, region: pulumi.Output<aws.Region>) {
        // Build the structure common to all simple widgets.  Defer to our subclasses for
        // details only they can fill in.
        widgetJsons.push({
            x: xOffset,
            y: yOffset,
            width: this.width(),
            height: this.height(),
            type: this.computeType(),
            properties: this.computeProperties(region),
        });
    }
}

export interface AlarmWidgetArgs extends SimpleWidgetArgs {
  /** An array of alarm ARNs to include in the widget. The array can have 1-100 ARNs. */
  alarms: pulumi.Input<string>[];

  /**
   * Specifies how to sort the alarms in the widget.
   *
   * Choose default to sort them in alphabetical order by alarm name.
   *
   * Choose stateUpdatedTimestamp to sort them first by alarm state, with alarms in ALARM state first,
   * INSUFFICIENT_DATA alarms next, and OK alarms last. Within each group, the alarms are sorted by when
   * they last changed state, with more recent state changes listed first.
   *
   * Choose timestamp to sort them by the time when the alarms most recently changed state, no matter
   * the current alarm state. The alarm that changed state most recently is listed first.
   *
   * If you omit this field, the alarms are sorted in alphabetical order.
   */
  sortBy?: pulumi.Input<"default" | "stateUpdatedTimestamp" | "timestamp" | undefined>;

  /**
   * Use this field to filter the list of alarms displayed in the widget to only those alarms
   * currently in the specified states. You can specify one or more alarm states in the value
   * for this field. The alarm states that you can specify are ALARM, INSUFFICIENT_DATA, and OK.
   *
   * If you omit this field or specify an empty array, all the alarms specified in alarms are displayed.
   */
  states?: pulumi.Input<("ALARM" | "INSUFFICIENT_DATA" | "OK")[] | undefined>;

  /** The title to be displayed for the alarm widget. */
  title?: pulumi.Input<string>;
}

/**
 * Simple widget that displays an array of cloudwatch alarm status in the dashboard grid.
 */
export class AlarmWidget extends SimpleWidget {
  private readonly alarmArgs: AlarmWidgetArgs;

  constructor(args: AlarmWidgetArgs) {
    super(args);

    this.alarmArgs = args;
  }

  public height() {
    return this.alarmArgs.height !== undefined ? this.alarmArgs.height : 2;
  }

  protected computeType(): wjson.AlarmWidgetJson["type"] {
    return "alarm";
  }

  protected computeProperties(region: pulumi.Output<aws.Region>): wjson.AlarmWidgetJson["properties"] {
    return {
      alarms: this.alarmArgs.alarms,
      sortBy: this.alarmArgs.sortBy,
      states: this.alarmArgs.states,
      title: this.alarmArgs.title,
    };
  }
}


/**
 * Simple [Widget] that can be used for putting space between other widgets in the [Dashboard].
 */
export class SpaceWidget implements Widget {
    private readonly _width: number;
    private readonly _height: number;

    constructor(width: number, height: number);
    constructor(args: SimpleWidgetArgs);
    constructor(widthOrArgs: number | SimpleWidgetArgs, height?: number) {
        if (typeof widthOrArgs === "number") {
            this._width = widthOrArgs;
            this._height = height!;
        }
        else {
            this._width = widthOrArgs.width !== undefined ? widthOrArgs.width : 6;
            this._height = widthOrArgs.height !== undefined ? widthOrArgs.height : 6;
        }
    }

    public width() { return this._width; }
    public height() { return this._height; }

    public addWidgetJson(widgetJsons: wjson.WidgetJson[], xOffset: number, yOffset: number): void {
        // Nothing to do.  This Widget exists just to ensure proper placement of other real widgets.
    }
}

export interface TextWidgetArgs extends SimpleWidgetArgs {
    /**
     * The text to be displayed by the widget.
     */
    markdown: pulumi.Input<string>;
}

/**
 * Simple widget that displays a piece of text in the dashboard grid.
 */
export class TextWidget extends SimpleWidget {
    private readonly textArgs: TextWidgetArgs;

    constructor(markdown: string);
    constructor(args: TextWidgetArgs);
    constructor(markdownOrArgs: string | TextWidgetArgs) {
        const args = typeof markdownOrArgs === "string" ? { markdown: markdownOrArgs } : markdownOrArgs;
        super(args);

        this.textArgs = args;
    }

    protected computeType(): wjson.TextWidgetJson["type"] {
        return "text";
    }

    protected computeProperties(region: pulumi.Output<aws.Region>): wjson.TextWidgetJson["properties"] {
        return { markdown: this.textArgs.markdown };
    }
}

function flattenArray<T>(annotations: T | T[] | undefined) {
    return Array.isArray(annotations) ? annotations : annotations ? [annotations] : [];
}

export interface MetricWidgetArgs extends SimpleWidgetArgs {
    /**
     * Used to show a graph of a single alarm.  If, instead, you want to place horizontal lines in
     * graphs to show the trigger point of an alarm, then add the alarm to [annotations] instead.
     *
     * At least one of [alarm], [annotations] or [metrics] must be supplied.
     */
    alarm?: pulumi.Input<string> | WidgetAlarm;

    /**
     * A single metric widget can have up to one alarm, and multiple horizontal and vertical
     * annotations.
     *
     * An alarm annotation is required only when metrics is not specified. A horizontal or vertical
     * annotation is not required.
     *
     * Instances of this interface include [aws.cloudwatch.Alarm], [AlarmAnnotation],
     * [HorizontalAnnotation] and [VerticalAnnotation].
     *
     * At least one of [alarm], [annotations] or [metrics] must be supplied.
     */
    annotations?: WidgetAnnotation | WidgetAnnotation[];

    /**
     * Specify a metrics array to include one or more metrics (without alarms), math expressions, or
     * search expressions. One metrics array can include 0–100 metrics and expressions.
     *
     * See [ExpressionWidgetMetric] and [Metric] to create instances that can be added to this
     * array.
     *
     * At least one of [alarm], [annotations] or [metrics] must be supplied.
     */
    metrics?: WidgetMetric | WidgetMetric[];

    /** The title to be displayed for the graph or number. */
    title?: pulumi.Input<string>;

    /**
     * The default period, in seconds, for all metrics in this widget. The period is the length of
     * time represented by one data point on the graph. This default can be overridden within each
     * metric definition. The default is 300.
     */
    period?: pulumi.Input<number>;

    /**
     * The region of the metric.  Defaults to the region of the stack if not specified.
     */
    region?: pulumi.Input<aws.Region>;

    /**
     * The default statistic to be displayed for each metric in the array. This default can be
     * overridden within the definition of each individual metric in the metrics array.
     */
    statistic?: pulumi.Input<MetricStatistic>;

    /**
     * The percentile statistic for the metric associated with the alarm. Specify a value between
     * [0.0] and [100].
     */
    extendedStatistic?: pulumi.Input<number>;
}

export interface WidgetAlarm {
    arn: pulumi.Input<string>;
}

/**
 * Base type for widgets that display data from a set of [Metric]s.  See [LineGraphMetricWidget],
 * [StackedAreaGraphMetricWidget] and [SingleNumberMetricWidget] as concrete [Widget] instances for
 * displaying [Metric]s.
 */
export abstract class MetricWidget extends SimpleWidget {
    private readonly annotations: WidgetAnnotation[];
    private readonly metrics: WidgetMetric[];

    constructor(private readonly metricArgs: MetricWidgetArgs) {
        super(metricArgs);

        this.annotations = flattenArray(metricArgs.annotations);
        this.metrics = flattenArray(metricArgs.metrics);

        // If they specified an alarm, then make an appropriate annotation that will set
        // properties.alarms.
        const alarm = metricArgs.alarm;
        if (alarm) {
            const alarmArm = pulumi.all([(<WidgetAlarm>alarm).arn, <pulumi.Input<string>>alarm])
                                   .apply(([s1, s2]) => s1 || s2);
            this.annotations.push(new AlarmAnnotation(alarmArm));
        }

        if (this.annotations.length === 0 && this.metrics.length === 0) {
            throw new Error("[args.metrics] must be provided if [args.annotations] is not provided.");
        }
    }

    protected abstract computeView(): wjson.MetricWidgetPropertiesJson["view"];
    protected abstract computedStacked(): wjson.MetricWidgetPropertiesJson["stacked"];
    protected abstract computeYAxis(): wjson.MetricWidgetPropertiesJson["yAxis"];

    protected computeType = (): wjson.MetricWidgetJson["type"] => "metric";

    protected computeProperties(region: pulumi.Output<aws.Region>): wjson.MetricWidgetJson["properties"] {
        const stat = pulumi.all([this.metricArgs.extendedStatistic, this.metricArgs.statistic])
                           .apply(([extendedStatistic, statistic]) => {
            if (statistic !== undefined && extendedStatistic !== undefined) {
                throw new Error("[args.statistic] and [args.extendedStatistic] cannot both be provided.");
            }

            return extendedStatistic !== undefined ? `p${extendedStatistic}` : statistic!;
        });


        let annotations: wjson.MetricWidgetAnnotationsJson | undefined;
        if (this.annotations.length > 0) {
            annotations = {};
            for (const annotation of this.annotations) {
                annotation.addWidgetJson(annotations);
            }
        }

        let metrics: wjson.MetricJson[] | undefined;
        if (this.metrics.length > 0) {
            metrics = [];
            for (const metric of this.metrics) {
                metric.addWidgetJson(metrics);
            }
        }

        const result = {
            stat,
            metrics,
            annotations,
            title: this.metricArgs.title,
            period: utils.ifUndefined(this.metricArgs.period, 300).apply(p => {
                if (p % 60 !== 0) {
                    throw new Error(`Dashboard metric period must be a multiple of 60: ${p}`);
                }

                return p;
            }),
            region: utils.ifUndefined(this.metricArgs.region, region),
            view: this.computeView(),
            stacked: this.computedStacked(),
            yAxis: this.computeYAxis(),
        };

        return result;
    }
}

export interface LogWidgetArgs extends SimpleWidgetArgs {
    /**
     * Used to show a graph of a single query in a timeseries or singlevalue
     */
    query: pulumi.Input<string>;

    /** The title to be displayed for the graph or number. */
    title?: pulumi.Input<string>;

    /**
     * The region of the metric.  Defaults to the region of the stack if not specified.
     */
    region?: pulumi.Input<aws.Region>;
}

/**
 * Simple widget that displays a cloudwatch log query onn the dashboard grid.
 */
export class LogWidget extends SimpleWidget {
    private readonly logArgs: LogWidgetArgs;

    constructor(args: LogWidgetArgs) {
        super(args);

        this.logArgs = args;
    }

    public height() {
        return this.logArgs.height !== undefined ? this.logArgs.height : 2;
    }

    protected computeType(): wjson.LogWidgetJson["type"] {
        return "log";
    }
    protected computeView = (): wjson.MetricWidgetPropertiesJson["view"] => "timeSeries";
    protected computedStacked = () => false;

    protected computeProperties(region: pulumi.Output<aws.Region>): wjson.LogWidgetJson["properties"] {
        return {
        query: this.logArgs.query,
        title: this.logArgs.title,
        region: utils.ifUndefined(this.logArgs.region, region),
        view: this.computeView(),
        stacked: this.computedStacked(),
        };
    }
}

/** @internal */
export function statisticString(obj: { extendedStatistic: pulumi.Input<number | undefined>, statistic: pulumi.Input<MetricStatistic> }) {
    return pulumi.output(obj).apply(obj => {
        if (obj.statistic !== undefined && obj.extendedStatistic !== undefined) {
            throw new Error("[args.statistic] and [args.extendedStatistic] cannot both be provided.");
        }

        return obj.extendedStatistic !== undefined ? `p${obj.extendedStatistic}` : obj.statistic;
    });
}

/**
 * Base type for all objects that can be placed in the [metrics] array of [MetricWidgetArgs].
 *
 * See [ExpressionWidgetMetric] and [Metric] to create instances that can be added to
 * [MetricWidgetArgs.metrics].
 */
export interface WidgetMetric {
    /** For internal use only. Only intended to be called by [MetricWidget]. */
    addWidgetJson(metrics: wjson.MetricJson[]): void;
}

/**
 * Used to pass math or search expressions to a [MetricWidget].
 *
 * See https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html and
 * https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-search-expressions.html for
 * more details.
 */
export class ExpressionWidgetMetric implements WidgetMetric {
    /**
     * @param expression The math expression or search expression.
     * @param label The label to display in the graph to represent this time series.
     * @param id The id of this time series. This id can be used as part of a math expression.
     */
    constructor(private readonly expression: pulumi.Input<string>,
                private readonly label?: pulumi.Input<string>,
                private readonly id?: pulumi.Input<string>) {
    }

    /** For internal use only. */
    addWidgetJson(metrics: wjson.MetricJson[]): void {
        const json: wjson.ExpressionMetricJson = [{
            expression: this.expression,
            label: this.label,
            id: this.id,
        }];

        metrics.push(json);
    }
}
