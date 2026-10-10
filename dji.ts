//% color="#222222" weight=100 icon="\uf1d8"
//% block="DJI SYSTEM BETA 1"
namespace DJI_SYSTEM_BETA_1 {

    /**
     * Start DJI SYSTEM BETA 1
     */
    //% block="start DJI SYSTEM BETA 1"
    //% weight=100
    export function start(): void {
        basic.showString("DJI")
    }

    /**
     * DJI FLY
     */
    //% block="DJI FLY"
    //% weight=90
    export function fly(): void {
        basic.showString("FLY")
    }

    /**
     * Games
     */
    //% block="GAMES"
    //% weight=80
    export function games(): void {
        basic.showString("GAME")
    }

    /**
     * Rain detector
     */
    //% block="RAIN"
    //% weight=70
    export function rain(): void {
        basic.showString("RAIN")
    }

    /**
     * Fire detector
     */
    //% block="FIRE"
    //% weight=60
    export function fire(): void {
        basic.showString("FIRE")
    }
}
