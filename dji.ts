//% color="#111111" icon="\uf1d8" weight=100
namespace DJI_SYSTEM_BETA_1 {

    //% block="START DJI SYSTEM BETA 1"
    //% weight=100
    export function startSystem(): void {
        basic.showString("DJI")
    }

    //% block="DJI FLY"
    //% weight=90
    export function djiFly(): void {
        basic.showString("FLY")
    }

    //% block="GAMES"
    //% weight=80
    export function games(): void {
        basic.showString("GAME")
    }

    //% block="RAIN"
    //% weight=70
    export function rain(): void {
        basic.showString("RAIN")
    }

    //% block="FIRE"
    //% weight=60
    export function fire(): void {
        basic.showString("FIRE")
    }
}
