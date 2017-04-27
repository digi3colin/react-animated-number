import React, {Component} from 'react';
import PropTypes from 'prop-types';
import raf from 'raf';
import BigNumber from 'bignumber.js';

const ANIMATION_DURATION: number = 300;

type AnimatedNumberProps = {
    component: any,
    formatValue: ?(n: number) => string,
    value: Object | number,
    duration: ?number,
    frameStyle: ?(perc: number) => Object | void,
    stepPrecision: ?number,
    style: any
};

export default class AnimatedNumber extends Component {

    totalFrames: number;
    tweenStep: number;
    tweenHandle: number;
    state: {
        currentValue: number;
        frame: number;
    };
    props: AnimatedNumberProps;



    static propTypes = {
        component: PropTypes.any,
        formatValue: PropTypes.func,
        value: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.instanceOf(BigNumber)
        ]),
        duration: PropTypes.number,
        frameStyle: PropTypes.func,
        stepPrecision: PropTypes.number,
        style: PropTypes.object,
        className: PropTypes.string
    }

    static defaultProps = {
        component: 'span',
        formatValue: n => n,
        duration: ANIMATION_DURATION,
        frameStyle: () => ({})
    }

    constructor() {
        super();
        this.state = {
            currentValue: 0
        };
    }

    componentDidMount() {
        console.log(this.props);
        this.prepareTween(this.props);
    }

    componentWillReceiveProps(nextProps: AnimatedNumberProps) {


        // if (this.nextProps.value && typeof this.nextProps.value === 'object') {
        //     this.nextProps.value = this.nextProps.value.toNumber();
        // }

        if (this.state.currentValue === nextProps.value) {
            return;
        }

        if (this.tweenHandle) {
            this.endTween();
        }

        this.prepareTween(nextProps);
    }

    componentWillUnmount() {
        this.endTween();
    }

    prepareTween() {
        this.tweenHandle = raf((timestamp) => {
            this.tweenValue(timestamp, true);
        });

    }

    endTween() {
        raf.cancel(this.tweenHandle);
        const value = typeof this.props.value === 'object' ?
            this.props.value.toNumber() : this.props.value;
        this.setState({
            ...this.state,
            currentValue: value
        });
    }

    ensureSixtyFps(timestamp) {

        const {currentTime} = this.state;

        return !currentTime || (timestamp - currentTime > 16);
    }

    tweenValue(timestamp, start) {

        if (!this.ensureSixtyFps(timestamp)) {
            raf(this.tweenValue.bind(this));
            return;
        }

        const {duration} = this.props;
        let {value} = this.props;
        value = typeof value === 'object' ? value.toNumber() : value;

        const {currentValue} = this.state;
        const currentTime = timestamp;
        const startTime = start ? timestamp : this.state.startTime;
        const fromValue = start ? currentValue : this.state.fromValue;
        let newValue;

        if (currentTime - startTime >= duration) {
            newValue = value;
        } else {
            newValue = fromValue + (
                (value - fromValue) * ((currentTime - startTime) / duration)
            );
        }

        if (newValue === value) {
            this.endTween();
            return;
        }

        this.setState({
            currentValue: newValue,
            startTime: startTime ? startTime : currentTime,
            fromValue, currentTime
        });
        raf(this.tweenValue.bind(this));
    }

    render() {
        const {formatValue, value, className, frameStyle, stepPrecision} = this.props;
        const {currentValue, fromValue} = this.state;

        let {style} = this.props;
        let adjustedValue: number = currentValue;
        const direction = value - fromValue;

        if (currentValue !== value) {
            if (stepPrecision > 0) {
                adjustedValue = Number(currentValue.toFixed(stepPrecision));
            } else if (direction < 0 && stepPrecision === 0) {
                adjustedValue = Math.floor(currentValue);
            } else if (direction > 0 && stepPrecision === 0) {
                adjustedValue = Math.ceil(currentValue);
            }
        }

        const perc = Math.abs((adjustedValue - fromValue) / (value - fromValue) * 100);

        const currStyle: (Object | null) = frameStyle(perc);

        if (style && currStyle) {
            style = {
                ...style,
                ...currStyle
            };
        } else if (currStyle) {
            style = currStyle;
        }

        const title = typeof this.props.value === 'object' ?
            this.props.value.valueOf() : this.props.value;

        return React.createElement(
            this.props.component,
            {...filterKnownProps(this.props), className, style, title},
            formatValue(adjustedValue)
        );
    }
}

function filterKnownProps(props) {
    const sanitized = {};
    const propNames = Object.keys(props);
    const validProps = Object.keys(AnimatedNumber.propTypes);

    propNames.filter(p => validProps.indexOf(p) < 0).forEach(p => {
        sanitized[p] = props[p];
    });

    return sanitized;
};
