//% color="#111111" weight=100 icon="\uf1d8"
namespace DJI {

    //% blockId=dji_system_start
    //% block="START DJI SYSTEM BETA 1"
    //% weight=100
    export function startSystem(): void {
        basic.showString("DJI")
    }

    //% blockId=dji_system_fly
    //% block="DJI FLY"
    //% weight=90
    export function fly(): void {
        basic.showString("FLY")
    }

    //% blockId=dji_system_games
    //% block="GAMES"
    //% weight=80
    export function games(): void {
        basic.showString("GAME")
    }

    //% blockId=dji_system_rain
    //% block="RAIN"
    //% weight=70
    export function rain(): void {
        basic.showString("RAIN")
    }

    //% blockId=dji_system_fire
    //% block="FIRE"
    //% weight=60
    export function fire(): void {
        basic.showString("FIRE")
    }
}
