//% color="#222222" weight=100 icon="\uf1d8" block="DJI SYSTEM BETA 1"
namespace djiSystem {

    //% block="START DJI SYSTEM BETA 1"
    export function start(): void {
        basic.showString("DJI")
    }

    //% block="DJI FLY"
    export function fly(): void {
        basic.showString("FLY")
    }

    //% block="GAMES"
    export function games(): void {
        basic.showString("GAME")
    }

    //% block="RAIN"
    export function rain(): void {
        basic.showString("RAIN")
    }

    //% block="FIRE"
    export function fire(): void {
        basic.showString("FIRE")
    }
}
