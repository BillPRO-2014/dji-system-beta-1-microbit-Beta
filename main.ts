 RAIN: connect DO to P8; disconnect AO from P3. No AO-to-P12 connection.
// All 25 red LEDs indicate rain while the RAIN page is open.
// ============================================================
// DJI PRO + 20 GAMES + DJI FLY + RAIN
// Hardware in this build:
//   Joystick X=P0, Y=P1, SW=P2
//   Rain DO=P8; AO disconnected (P12 is not an analog input)
// Fire AO=P16, DO=NOT CONNECTED
//   OLED SCL=P19, SDA=P20
//
// Main flow kept as DJI PRO. RAIN is added after DJI FLY.
// ============================================================

const JOY_X = AnalogPin.P0
const JOY_Y = AnalogPin.P1
const JOY_SW = DigitalPin.P2
// Rain detection uses DO=P8; leave AO disconnected
const RAIN_DO = DigitalPin.P8

let JOY_NONE = 0
let JOY_UP = 1
let JOY_DOWN = 2
let JOY_LEFT = 3
let JOY_RIGHT = 4
let JOY_PRESS = 5

let joyCenterX = 512
let joyCenterY = 512
let joySwitchIdle = 1
let menuJoyArmed = true

let rainDryAO = 0
let rainDryDO = 1
let rainState = false
let rainWetCount = 0
let rainDryCount = 0

let GAME_NAMES = [
    "WALL ESCAPE",
    "MAZE ESCAPE",
    "SLOW JUMP",
    "FALLING BLOCK",
    "SPACE SHOOTER",
    "HIGHWAY RACER",
    "LANDING",
    "SNAKE TRAIL",
    "TARGET LOCK",
    "REACTION TEST",
    "CARGO CATCH",
    "BOMB DEFUSE",
    "PONG",
    "BREAKOUT",
    "MISSILE DODGE",
    "FLAPPY DRONE",
    "RADAR HUNT",
    "FUEL RESCUE",
    "NIGHT FLIGHT",
    "EMERGENCY PILOT"
]

let GAME_STAGE = 1
let GAME_TOTAL_STAGES = 3
let GAME_RESULT_READY = false
let GAME_RESULT_WIN = false
let GAME_RESULT_SCORE = 0

function clamp(v: number, lo: number, hi: number): number {
    if (v < lo) return lo
    if (v > hi) return hi
    return v
}

function absN(v: number): number {
    if (v < 0) return -v
    return v
}

function avgAnalog(pin: AnalogPin, count: number): number {
    let total = 0
    for (let i = 0; i < count; i++) {
        total += pins.analogReadPin(pin)
        basic.pause(3)
    }
    return Math.idiv(total, count)
}

function getJoy(): number {
    let x = pins.analogReadPin(JOY_X)
    let y = pins.analogReadPin(JOY_Y)
    if (pins.digitalReadPin(JOY_SW) != joySwitchIdle) return JOY_PRESS
    if (y < joyCenterY - 210) return JOY_UP
    if (y > joyCenterY + 210) return JOY_DOWN
    if (x < joyCenterX - 210) return JOY_LEFT
    if (x > joyCenterX + 210) return JOY_RIGHT
    return JOY_NONE
}

// Games now use exactly the same physical direction mapping.
// No manual reverse / no axis swap.
function getGameJoy(): number {
    return getJoy()
}

function joystickCentered(): boolean {
    return getJoy() == JOY_NONE
}

function getMenuJoy(): number {
    if (!menuJoyArmed) {
        if (joystickCentered()) {
            basic.pause(30)
            if (joystickCentered()) menuJoyArmed = true
        }
        return JOY_NONE
    }

    let j = getJoy()
    if (j == JOY_NONE) return JOY_NONE

    basic.pause(35)
    if (getJoy() == j) {
        menuJoyArmed = false
        return j
    }
    return JOY_NONE
}

// Built-in A+B is HOME/BACK in this 3-module build.
function homePressed(): boolean {
    if (input.buttonIsPressed(Button.A) && input.buttonIsPressed(Button.B)) {
        basic.pause(80)
        if (input.buttonIsPressed(Button.A) && input.buttonIsPressed(Button.B)) {
            while (input.buttonIsPressed(Button.A) || input.buttonIsPressed(Button.B)) {
                basic.pause(10)
            }
            return true
        }
    }
    return false
}

// No rotary encoder is connected now.
function encoderDelta(): number {
    return 0
}

function encoderPressed(): boolean {
    return false
}

// ---------------- No external 4-digit display in this build ----------------
function tmShowDigits(a: number, b: number, c: number, d: number) {
}
function tmShowNumber(v: number) {
}
function tmClear() {
}

// ---------------- OLED helpers ----------------

function oledPage(lines: string[]) {
    OLED.clear()
    for (let i = 0; i < lines.length; i++) {
        OLED.writeString(lines[i])
        if (i < lines.length - 1) OLED.newLine()
    }
}

function showProgress(p: number) {
    p = clamp(p, 0, 100)
    basic.clearScreen()

    let cols = Math.idiv(p + 19, 20)

    for (let x = 0; x < cols && x < 5; x++) {
        for (let y = 4; y >= 0; y--) {
            if (y >= 4 - x) led.plot(x, y)
        }
    }
}


function drawDJILogo() {
    // DJI-style wordmark drawn as filled horizontal strokes.
    // This is intentionally NOT three block letters.
    OLED.drawLine(66, 12, 77, 12)
    OLED.drawLine(66, 13, 77, 13)
    OLED.drawLine(65, 14, 76, 14)
    OLED.drawLine(65, 15, 76, 15)
    OLED.drawLine(65, 16, 76, 16)
    OLED.drawLine(64, 17, 76, 17)
    OLED.drawLine(64, 18, 75, 18)
    OLED.drawLine(64, 19, 75, 19)

    OLED.drawLine(18, 20, 52, 20)
    OLED.drawLine(64, 20, 86, 20)
    OLED.drawLine(94, 20, 107, 20)
    OLED.drawLine(17, 21, 52, 21)
    OLED.drawLine(63, 21, 86, 21)
    OLED.drawLine(94, 21, 107, 21)
    OLED.drawLine(16, 22, 51, 22)
    OLED.drawLine(63, 22, 85, 22)
    OLED.drawLine(94, 22, 107, 22)
    OLED.drawLine(14, 23, 51, 23)
    OLED.drawLine(63, 23, 85, 23)
    OLED.drawLine(93, 23, 106, 23)
    OLED.drawLine(13, 24, 51, 24)
    OLED.drawLine(62, 24, 85, 24)
    OLED.drawLine(93, 24, 106, 24)
    OLED.drawLine(12, 25, 51, 25)
    OLED.drawLine(62, 25, 85, 25)
    OLED.drawLine(93, 25, 106, 25)
    OLED.drawLine(12, 26, 50, 26)
    OLED.drawLine(62, 26, 84, 26)
    OLED.drawLine(93, 26, 106, 26)
    OLED.drawLine(11, 27, 50, 27)
    OLED.drawLine(61, 27, 84, 27)
    OLED.drawLine(92, 27, 105, 27)

    OLED.drawLine(11, 28, 27, 28)
    OLED.drawLine(61, 28, 84, 28)
    OLED.drawLine(92, 28, 105, 28)
    OLED.drawLine(11, 29, 26, 29)
    OLED.drawLine(61, 29, 84, 29)
    OLED.drawLine(92, 29, 105, 29)
    OLED.drawLine(10, 30, 26, 30)
    OLED.drawLine(61, 30, 83, 30)
    OLED.drawLine(92, 30, 105, 30)
    OLED.drawLine(10, 31, 25, 31)
    OLED.drawLine(60, 31, 83, 31)
    OLED.drawLine(91, 31, 104, 31)
    OLED.drawLine(9, 32, 25, 32)
    OLED.drawLine(60, 32, 83, 32)
    OLED.drawLine(91, 32, 104, 32)
    OLED.drawLine(9, 33, 25, 33)
    OLED.drawLine(60, 33, 83, 33)
    OLED.drawLine(91, 33, 104, 33)
    OLED.drawLine(9, 34, 25, 34)
    OLED.drawLine(59, 34, 82, 34)
    OLED.drawLine(91, 34, 104, 34)
    OLED.drawLine(8, 35, 24, 35)
    OLED.drawLine(59, 35, 82, 35)
    OLED.drawLine(90, 35, 103, 35)
    OLED.drawLine(8, 36, 24, 36)
    OLED.drawLine(59, 36, 82, 36)
    OLED.drawLine(90, 36, 103, 36)
    OLED.drawLine(8, 37, 24, 37)
    OLED.drawLine(58, 37, 82, 37)
    OLED.drawLine(90, 37, 103, 37)
    OLED.drawLine(8, 38, 24, 38)
    OLED.drawLine(58, 38, 81, 38)
    OLED.drawLine(90, 38, 103, 38)
    OLED.drawLine(8, 39, 24, 39)
    OLED.drawLine(57, 39, 81, 39)
    OLED.drawLine(89, 39, 102, 39)
    OLED.drawLine(8, 40, 25, 40)
    OLED.drawLine(55, 40, 81, 40)
    OLED.drawLine(89, 40, 102, 40)

    OLED.drawLine(8, 41, 81, 41)
    OLED.drawLine(89, 41, 102, 41)
    OLED.drawLine(8, 42, 68, 42)
    OLED.drawLine(70, 42, 80, 42)
    OLED.drawLine(89, 42, 102, 42)
    OLED.drawLine(8, 43, 80, 43)
    OLED.drawLine(88, 43, 101, 43)
    OLED.drawLine(9, 44, 67, 44)
    OLED.drawLine(69, 44, 80, 44)
    OLED.drawLine(88, 44, 101, 44)
    OLED.drawLine(10, 45, 67, 45)
    OLED.drawLine(69, 45, 79, 45)
    OLED.drawLine(88, 45, 101, 45)
    OLED.drawLine(11, 46, 66, 46)
    OLED.drawLine(68, 46, 79, 46)
    OLED.drawLine(88, 46, 101, 46)
    OLED.drawLine(12, 47, 79, 47)
    OLED.drawLine(87, 47, 100, 47)
    OLED.drawLine(16, 48, 78, 48)
    OLED.drawLine(87, 48, 100, 48)
    OLED.drawLine(19, 49, 77, 49)
    OLED.drawLine(87, 49, 100, 49)
    OLED.drawLine(57, 50, 77, 50)
    OLED.drawLine(57, 51, 76, 51)
    OLED.drawLine(56, 52, 75, 52)
    OLED.drawLine(56, 53, 73, 53)
    OLED.drawLine(55, 54, 72, 54)
    OLED.drawLine(55, 55, 66, 55)
}

function animateDJILogo() {
    OLED.clear()
    // Reveal the actual-shaped wordmark in three clean passes.
    for (let x = 0; x <= 127; x += 8) {
        OLED.drawLine(x, 8, x, 9)
        basic.pause(8)
    }
    OLED.clear()
    drawDJILogo()
    basic.pause(900)
}

function drawMainMenu(sel: number) {
    OLED.clear()
    OLED.writeString("DJI PRO")
    OLED.newLine()
    OLED.writeString("MAIN MENU")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    if (sel == 0) OLED.writeString("> GAMES <")
    else OLED.writeString(" GAMES")
    OLED.newLine()
    if (sel == 1) OLED.writeString("> DJI FLY <")
    else OLED.writeString(" DJI FLY")
    OLED.newLine()
    if (sel == 2) OLED.writeString("> RAIN <")
    else OLED.writeString(" RAIN")
    OLED.newLine()
    if (sel == 3) OLED.writeString("> FIRE <")
    else OLED.writeString(" FIRE")
    OLED.newLine()
    OLED.writeString("----------------")
}

function drawGameSelector(game: number) {
    OLED.clear()
    OLED.writeString("GAME SELECT")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    OLED.writeString("SELECTED ")
    if (game + 1 < 10) OLED.writeString("0")
    OLED.writeNum(game + 1)
    OLED.writeString("/20")
    OLED.newLine()
    OLED.writeString(GAME_NAMES[game])
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    OLED.writeString("JOY = SELECT")
    OLED.newLine()
    OLED.writeString("PRESS = PLAY")
    OLED.newLine()
    OLED.writeString("A+B = BACK")
}

function drawDisplaySelector(sel: number) {
    OLED.clear()
    OLED.writeString("SELECT DISPLAY")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    if (sel == 0) OLED.writeString("> OLED PLAY")
    else OLED.writeString(" OLED PLAY")
    OLED.newLine()
    if (sel == 1) OLED.writeString("> MICROBIT PLAY")
    else OLED.writeString(" MICROBIT PLAY")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    OLED.writeString("JOY = SELECT")
    OLED.newLine()
    OLED.writeString("PRESS = ENTER")
}


function techMiniScreen(throttle: number, mode: number, boost: boolean, warning: boolean) {
    basic.clearScreen()

    if (warning) {
        led.plot(0, 0)
        led.plot(1, 1)
        basic.showLeds(`
        # # # # #
        # # # # #
        # # # # #
        # # # # #
        # # # # #
        `)
        led.plot(3, 3)
        led.plot(4, 4)
        led.plot(4, 0)
        led.plot(3, 1)
        led.plot(1, 3)
        led.plot(0, 4)
        return
    }

    // Flight computer core.
    led.plotBrightness(2, 2, 255)
    led.plotBrightness(2, 1, 90)
    led.plotBrightness(2, 3, 90)
    led.plotBrightness(1, 2, 90)
    led.plotBrightness(3, 2, 90)

    // Throttle bars.
    let level = Math.idiv(throttle + 19, 20)
    for (let i = 0; i < level && i < 5; i++) {
        led.plotBrightness(0, 4 - i, 160)
        led.plotBrightness(4, 4 - i, 160)
    }

    // C / N / S / M mode marker.
    if (mode == 0) led.plot(1, 0)
    if (mode == 1) led.plot(3, 0)
    if (mode == 2) led.plot(3, 4)
    if (mode == 3) led.plot(1, 4)

    if (boost) {
        led.plot(2, 0)
        led.plot(2, 1)
        basic.showLeds(`
        # # # # #
        # # # # #
        # # # # #
        # # # # #
        # # # # #
        `)
        led.plot(2, 3)
        led.plot(2, 4)
        led.plot(0, 2)
        led.plot(1, 2)
        led.plot(3, 2)
        led.plot(4, 2)
    }
}

function djiBoot() {
    OLED.clear()
    // Futuristic scan boot animation
    for (let y = 0; y <= 63; y += 4) {
        OLED.drawLine(0, y, 127, y)
        basic.pause(18)
    }
    basic.pause(120)
    OLED.clear()
    OLED.writeString("SYSTEM INITIALIZING")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    OLED.newLine()
    for (let x = 8; x <= 118; x += 5) {
        OLED.drawLine(8, 38, x, 38)
        OLED.drawLine(8, 39, x, 39)
        basic.pause(25)
    }
    OLED.newLine()
    OLED.newLine()
    OLED.writeString("SYSTEM ONLINE")
    basic.showIcon(IconNames.Diamond)
    basic.pause(500)
    basic.clearScreen()
    OLED.clear()
}

function mainMenu(): number {
    let sel = 0
    drawMainMenu(sel)

    while (true) {
        let j = getMenuJoy()
        let changed = false

        if (j == JOY_UP || j == JOY_LEFT) {
            sel--
            if (sel < 0) sel = 3
            changed = true
        }

        if (j == JOY_DOWN || j == JOY_RIGHT) {
            sel++
            if (sel > 3) sel = 0
            changed = true
        }

        if (changed) {
            drawMainMenu(sel)
            basic.pause(80)
        }

        if (j == JOY_PRESS) {
            basic.pause(100)
            return sel
        }

        basic.pause(10)
    }
}

function gameListPage(page: number) {
    // Kept only for compatibility with the old program structure.
    // The new selector uses drawGameSelector() so the selected game is always obvious.
    let game = page * 5
    if (game > 19) game = 19
    drawGameSelector(game)
}


function chooseGame(): number {
    let game = 0
    drawGameSelector(game)

    while (true) {
        if (homePressed()) return -1

        let j = getMenuJoy()
        let changed = false

        if (j == JOY_UP || j == JOY_LEFT) {
            game--
            if (game < 0) game = 19
            changed = true
        }

        if (j == JOY_DOWN || j == JOY_RIGHT) {
            game++
            if (game > 19) game = 0
            changed = true
        }

        if (changed) {
            drawGameSelector(game)
            basic.pause(70)
        }

        if (j == JOY_PRESS) return game
        basic.pause(10)
    }
}

function choosePlayScreen(): number {
    OLED.clear()
    OLED.writeString("OLED GAME MODE")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    OLED.writeString("RAIN AO USES P3")
    OLED.newLine()
    OLED.writeString("5x5 IS DISABLED")
    OLED.newLine()
    OLED.newLine()
    OLED.writeString("PRESS TO START")
    OLED.newLine()
    OLED.writeString("A+B = BACK")
    while (true) {
        if (homePressed()) return -1
        if (getJoy() == JOY_PRESS) {
            while (getJoy() == JOY_PRESS) basic.pause(10)
            return 0
        }
        basic.pause(15)
    }
}

function resultPage(win: boolean, score: number) {
    GAME_RESULT_READY = true
    GAME_RESULT_WIN = win
    GAME_RESULT_SCORE = score

    OLED.clear()
    if (win) OLED.writeString("STAGE CLEAR")
    else OLED.writeString("STAGE FAILED")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    OLED.writeString("STAGE ")
    OLED.writeNum(GAME_STAGE)
    OLED.writeString("/")
    OLED.writeNum(GAME_TOTAL_STAGES)
    OLED.newLine()
    OLED.writeString("SCORE ")
    OLED.writeNum(score)
    OLED.newLine()
    OLED.newLine()
    OLED.writeString("PRESS CONTINUE")

    basic.pause(250)
    while (getJoy() == JOY_PRESS) basic.pause(10)
    while (true) {
        if (homePressed()) return
        if (getJoy() == JOY_PRESS) {
            while (getJoy() == JOY_PRESS) basic.pause(10)
            return
        }
        basic.pause(15)
    }
}

// ============================================================
// OLED GAME 1: WALL ESCAPE - four directions
// ============================================================

function oledWallEscape() {
    OLED.clear()
    OLED.writeString("WALL ESCAPE")
    OLED.newLine()
    OLED.writeString("RANDOM STAGE ")
    OLED.writeNum(GAME_STAGE)
    OLED.newLine()

    OLED.drawRectangle(5, 18, 122, 61)

    let gap1 = randint(27, 53)
    let gap2 = randint(27, 53)
    let gap3 = randint(27, 53)
    let goalY = randint(26, 54)

    OLED.drawLine(30, 18, 30, gap1 - 5)
    OLED.drawLine(30, gap1 + 5, 30, 61)
    OLED.drawLine(58, 18, 58, gap2 - 5)
    OLED.drawLine(58, gap2 + 5, 58, 61)
    OLED.drawLine(88, 18, 88, gap3 - 5)
    OLED.drawLine(88, gap3 + 5, 88, 61)
    OLED.drawRectangle(109, goalY - 4, 119, goalY + 4)

    let x = 12
    let y = randint(24, 56)
    let moves = 0
    let limit = 145 - GAME_STAGE * 10
    let delay = 85 - GAME_STAGE * 10

    while (moves < limit) {
        if (homePressed()) return

        let j = getGameJoy()
        let ox = x
        let oy = y

        if (j == JOY_UP) y -= 3
        if (j == JOY_DOWN) y += 3
        if (j == JOY_LEFT) x -= 3
        if (j == JOY_RIGHT) x += 3

        x = clamp(x, 8, 119)
        y = clamp(y, 21, 58)

        if (x >= 28 && x <= 32 && !(y >= gap1 - 5 && y <= gap1 + 5)) {
            x = ox
            y = oy
        }
        if (x >= 56 && x <= 60 && !(y >= gap2 - 5 && y <= gap2 + 5)) {
            x = ox
            y = oy
        }
        if (x >= 86 && x <= 90 && !(y >= gap3 - 5 && y <= gap3 + 5)) {
            x = ox
            y = oy
        }

        if (x != ox || y != oy) {
            OLED.drawLine(ox, oy, x, y)
            moves++
            tmShowNumber(moves)
            showProgress(Math.idiv(x * 100, 122))
            basic.pause(delay)
        }

        if (x >= 106 && absN(y - goalY) <= 7) {
            resultPage(true, clamp(1500 + GAME_STAGE * 150 - moves * 5, 100, 1900))
            return
        }

        basic.pause(10)
    }

    resultPage(false, 100)
}

// ============================================================
// OLED GAME 2: MAZE ESCAPE
// ============================================================

function oledMazeEscape() {
    OLED.clear()
    OLED.writeString("MAZE ESCAPE")
    OLED.newLine()
    OLED.writeString("RANDOM STAGE ")
    OLED.writeNum(GAME_STAGE)
    OLED.newLine()

    OLED.drawRectangle(5, 18, 122, 61)

    let wallX = [25, 45, 65, 85, 105]
    let gaps = [
        randint(25, 54),
        randint(25, 54),
        randint(25, 54),
        randint(25, 54),
        randint(25, 54)
    ]

    for (let i = 0; i < 5; i++) {
        OLED.drawLine(wallX[i], 18, wallX[i], gaps[i] - 5)
        OLED.drawLine(wallX[i], gaps[i] + 5, wallX[i], 61)
    }

    let goalY = randint(25, 55)
    OLED.drawRectangle(112, goalY - 4, 120, goalY + 4)

    let x = 10
    let y = randint(23, 57)
    let moves = 0
    let limit = 175 - GAME_STAGE * 10

    while (moves < limit) {
        if (homePressed()) return

        let j = getGameJoy()
        let ox = x
        let oy = y

        if (j == JOY_UP) y -= 3
        if (j == JOY_DOWN) y += 3
        if (j == JOY_LEFT) x -= 3
        if (j == JOY_RIGHT) x += 3

        x = clamp(x, 8, 119)
        y = clamp(y, 21, 58)

        for (let i = 0; i < 5; i++) {
            if (x >= wallX[i] - 2 && x <= wallX[i] + 2) {
                if (!(y >= gaps[i] - 5 && y <= gaps[i] + 5)) {
                    x = ox
                    y = oy
                }
            }
        }

        if (x != ox || y != oy) {
            OLED.drawLine(ox, oy, x, y)
            moves++
            tmShowNumber(moves)
            showProgress(Math.idiv(x * 100, 122))
            basic.pause(75 - GAME_STAGE * 8)
        }

        if (x >= 109 && absN(y - goalY) <= 7) {
            resultPage(true, clamp(1700 + GAME_STAGE * 150 - moves * 5, 100, 2100))
            return
        }

        basic.pause(10)
    }

    resultPage(false, 100)
}

// ============================================================
// OLED GAME 3: SLOW JUMP
// ============================================================

function oledSlowJump() {
    OLED.clear()
    OLED.writeString("SLOW JUMP")
    OLED.newLine()
    OLED.writeString("PRESS = JUMP")
    OLED.newLine()

    OLED.drawRectangle(5, 18, 122, 61)
    OLED.drawLine(5, 58, 122, 58)

    let o1 = randint(34, 44)
    let o2 = randint(66, 79)
    let o3 = randint(96, 110)

    let h1 = randint(43, 49)
    let h2 = randint(42, 49)
    let h3 = randint(41, 48)

    OLED.drawLine(o1, h1, o1, 58)
    OLED.drawLine(o2, h2, o2, 58)
    OLED.drawLine(o3, h3, o3, 58)
    let x = 10
    let y = 55
    let jumpTicks = 0
    let score = 0

    while (x < 118) {
        if (homePressed()) return

        let j = getGameJoy()

        if ((j == JOY_PRESS || encoderPressed()) && jumpTicks == 0) {
            jumpTicks = 5
        }

        let ox = x
        let oy = y

        x += 2 + Math.idiv(GAME_STAGE - 1, 2)

        if (jumpTicks > 0) {
            y = 34
            jumpTicks--
        } else {
            y = 55
        }

        OLED.drawLine(ox, oy, x, y)

        if (absN(x - o1) <= 2 && y >= h1 - 2) { resultPage(false, score); return }
        if (absN(x - o2) <= 2 && y >= h2 - 2) { resultPage(false, score); return }
        if (absN(x - o3) <= 2 && y >= h3 - 2) { resultPage(false, score); return }

        score += 10
        tmShowNumber(score)
        showProgress(Math.idiv((x - 10) * 100, 108))
        basic.pause(95 - GAME_STAGE * 12)
    }

    resultPage(true, 1200 + GAME_STAGE * 150)
}

// ============================================================
// OLED GAME 4: FALLING BLOCK
// ============================================================

function oledFalling() {
    OLED.clear()
    OLED.writeString("FALLING BLOCK")
    OLED.newLine()
    OLED.writeString("RANDOM STAGE ")
    OLED.writeNum(GAME_STAGE)
    OLED.newLine()
    OLED.drawRectangle(5, 18, 122, 61)

    let catchX = 64
    let hits = 0
    let rounds = 4 + GAME_STAGE

    for (let round = 0; round < rounds; round++) {
        let blockX = randint(15, 112)
        let y = 21

        OLED.drawRectangle(blockX - 2, 20, blockX + 2, 24)

        while (y < 56) {
            if (homePressed()) return

            let j = getGameJoy()
            let e = encoderDelta()

            if (j == JOY_LEFT || e < 0) catchX -= 4
            if (j == JOY_RIGHT || e > 0) catchX += 4

            catchX = clamp(catchX, 12, 116)

            OLED.drawLine(blockX, y, blockX, y + 2)
            y += 2

            tmShowNumber(hits * 100 + round)
            showProgress(Math.idiv((round + 1) * 100, rounds))
            basic.pause(110 - GAME_STAGE * 15)
        }

        OLED.drawLine(catchX - 8, 59, catchX + 8, 59)

        if (absN(catchX - blockX) <= 10) hits++
    }

    let need = Math.idiv(rounds + 1, 2)
    if (hits >= need) resultPage(true, hits * 220)
    else resultPage(false, hits * 120)
}

// ============================================================
// OLED GAME 5: SPACE SHOOTER
// ============================================================

function oledShooter() {
    OLED.clear()
    OLED.writeString("SPACE SHOOTER")
    OLED.newLine()
    OLED.writeString("RANDOM TARGETS")
    OLED.newLine()

    let score = 0
    let rounds = 4 + GAME_STAGE
    let tolerance = 7 - GAME_STAGE

    for (let round = 0; round < rounds; round++) {
        let targetX = randint(18, 110)
        OLED.drawRectangle(targetX - 4, 21, targetX + 4, 27)

        let aim = randint(35, 90)
        let fired = false
        while (!fired) {
            if (homePressed()) return

            let j = getGameJoy()
            let e = encoderDelta()

            if (j == JOY_LEFT || e < 0) aim -= 3
            if (j == JOY_RIGHT || e > 0) aim += 3
            aim = clamp(aim, 8, 120)

            tmShowNumber(aim)

            if (j == JOY_PRESS || encoderPressed()) {
                OLED.drawLine(aim, 59, aim, 29)
                if (absN(aim - targetX) <= tolerance) score++
                fired = true
                basic.pause(130)
            }

            basic.pause(15)
        }

        showProgress(Math.idiv((round + 1) * 100, rounds))
    }

    let need = Math.idiv(rounds + 1, 2)
    if (score >= need) resultPage(true, score * 230)
    else resultPage(false, score * 100)
}

// ============================================================
// OLED GAME 6: HIGHWAY RACER
// ============================================================

function oledHighway() {
    OLED.clear()
    OLED.writeString("HIGHWAY RACER")
    OLED.newLine()
    OLED.writeString("RANDOM TRAFFIC")
    OLED.newLine()
    OLED.drawRectangle(5, 18, 122, 61)
    OLED.drawLine(5, 32, 122, 32)
    OLED.drawLine(5, 47, 122, 47)

    let oxs = [34, 57, 80, 103]
    let lanes = [randint(0, 2), randint(0, 2), randint(0, 2), randint(0, 2)]

    for (let i = 0; i < 4; i++) {
        let oy = 25
        if (lanes[i] == 1) oy = 39
        if (lanes[i] == 2) oy = 54
        OLED.drawRectangle(oxs[i] - 3, oy - 4, oxs[i] + 3, oy + 4)
    }

    let lane = randint(0, 2)
    let x = 10
    let lastY = 39

    while (x < 116) {
        if (homePressed()) return

        let j = getGameJoy()
        if (j == JOY_UP) lane--
        if (j == JOY_DOWN) lane++
        lane = clamp(lane, 0, 2)

        let y = 39
        if (lane == 0) y = 25
        if (lane == 2) y = 54

        OLED.drawLine(x - 3, lastY, x, y)
        lastY = y

        for (let i = 0; i < 4; i++) {
            if (x >= oxs[i] - 6 && x <= oxs[i] + 6 && lane == lanes[i]) {
                resultPage(false, x * 6)
                return
            }
        }

        x += 3
        tmShowNumber((x - 10) * 10)
        showProgress(Math.idiv((x - 10) * 100, 106))
        basic.pause(115 - GAME_STAGE * 15)
    }

    resultPage(true, 1100 + GAME_STAGE * 150)
}

// ============================================================
// OLED GAME 7: LANDING
// ============================================================

function oledLanding() {
    OLED.clear()
    OLED.writeString("LANDING")
    OLED.newLine()
    OLED.writeString("RANDOM PAD")
    OLED.newLine()
    OLED.drawRectangle(5, 18, 122, 61)

    let padCenter = randint(28, 100)
    let padHalf = 14 - GAME_STAGE * 2
    if (padHalf < 7) padHalf = 7
    OLED.drawRectangle(padCenter - padHalf, 56, padCenter + padHalf, 60)

    let x = randint(20, 108)
    let y = 21
    let wind = randint(-1, 1)

    while (y < 55) {
        if (homePressed()) return

        let j = getGameJoy()
        let ox = x
        let oy = y

        if (j == JOY_LEFT) x -= 3
        if (j == JOY_RIGHT) x += 3
        if (j == JOY_UP) y -= 1
        if (j == JOY_DOWN) y += 2

        x += wind
        x = clamp(x, 9, 118)
        y += 2 + Math.idiv(GAME_STAGE - 1, 2)

        OLED.drawLine(ox, oy, x, y)
        tmShowNumber(absN(x - padCenter))
        showProgress(Math.idiv(y * 100, 60))
        basic.pause(145 - GAME_STAGE * 15)
    }

    if (absN(x - padCenter) <= padHalf) {
        resultPage(true, clamp(1300 - absN(x - padCenter) * 25 + GAME_STAGE * 100, 200, 1600))
    } else {
        resultPage(false, 200)
    }
}

// ============================================================
// OLED GAME 8: SNAKE TRAIL
// ============================================================

function oledSnake() {
    OLED.clear()
    OLED.writeString("SNAKE TRAIL")
    OLED.newLine()
    OLED.drawRectangle(5, 18, 122, 61)

    let x = 25
    let y = 40
    let dx = 3
    let dy = 0
    let foodX = randint(75, 112)
    let foodY = randint(24, 55)

    OLED.drawRectangle(foodX - 2, foodY - 2, foodX + 2, foodY + 2)

    for (let step = 0; step < 120; step++) {
        if (homePressed()) return

        let j = getGameJoy()
        if (j == JOY_UP) { dx = 0; dy = -3 }
        if (j == JOY_DOWN) { dx = 0; dy = 3 }
        if (j == JOY_LEFT) { dx = -3; dy = 0 }
        if (j == JOY_RIGHT) { dx = 3; dy = 0 }

        let ox = x
        let oy = y
        x += dx
        y += dy

        OLED.drawLine(ox, oy, x, y)

        if (x <= 6 || x >= 121 || y <= 19 || y >= 60) {
            resultPage(false, step * 5)
            return
        }

        if (absN(x - foodX) <= 4 && absN(y - foodY) <= 4) {
            resultPage(true, 1000)
            return
        }

        tmShowNumber(step)
        showProgress(Math.idiv(step * 100, 120))
        basic.pause(110)
    }

    resultPage(false, 300)
}

// ============================================================
// OLED GAME 9: TARGET LOCK
// ============================================================

function oledTarget() {
    OLED.clear()
    OLED.writeString("TARGET LOCK")
    OLED.newLine()
    OLED.writeString("4-D + PRESS")
    OLED.newLine()

    let tx = randint(30, 108)
    let ty = randint(27, 54)
    OLED.drawRectangle(tx - 5, ty - 5, tx + 5, ty + 5)

    let x = 15
    let y = 25
    let moves = 0

    while (moves < 100) {
        if (homePressed()) return

        let j = getGameJoy()
        let ox = x
        let oy = y

        if (j == JOY_UP) y -= 3
        if (j == JOY_DOWN) y += 3
        if (j == JOY_LEFT) x -= 3
        if (j == JOY_RIGHT) x += 3

        x = clamp(x, 8, 120)
        y = clamp(y, 20, 60)

        if (x != ox || y != oy) {
            OLED.drawLine(ox, oy, x, y)
            moves++
            tmShowNumber(moves)
            basic.pause(60)
        }

        if (j == JOY_PRESS || encoderPressed()) {
            if (absN(x - tx) <= 6 && absN(y - ty) <= 6) resultPage(true, 1000 - moves * 5)
            else resultPage(false, 200)
            return
        }

        basic.pause(10)
    }

    resultPage(false, 100)
}

// ============================================================
// GAME 10: REACTION
// ============================================================

function reactionGame(oledMode: boolean) {
    oledPage([
        "REACTION TEST",
        "1 UP 2 DOWN",
        "3 LEFT 4 RIGHT",
        "",
        "10 ROUNDS",
        "WATCH DISPLAY"
    ])

    let score = 0

    for (let round = 0; round < 10; round++) {
        if (homePressed()) return

        let target = randint(1, 4)
        tmShowNumber(target)

        if (!oledMode) {
            basic.clearScreen()
            if (target == 1) basic.showArrow(ArrowNames.North)
            if (target == 2) basic.showArrow(ArrowNames.South)
            if (target == 3) basic.showArrow(ArrowNames.West)
            if (target == 4) basic.showArrow(ArrowNames.East)
        } else {
            showProgress(round * 10)
        }

        let start = input.runningTime()

        while (input.runningTime() - start < 1750 - GAME_STAGE * 180) {
            let j = getGameJoy()
            let got = 0

            if (j == JOY_UP) got = 1
            if (j == JOY_DOWN) got = 2
            if (j == JOY_LEFT) got = 3
            if (j == JOY_RIGHT) got = 4

            if (got != 0) {
                if (got == target) score++
                basic.pause(180)
                break
            }

            basic.pause(10)
        }
    }

    resultPage(score >= 6, score * 100)
}

// ============================================================
// OLED GAME 11: CARGO CATCH
// ============================================================

function oledCargo() {
    OLED.clear()
    OLED.writeString("CARGO CATCH")
    OLED.newLine()
    OLED.writeString("RANDOM CARGO")
    OLED.newLine()
    OLED.drawRectangle(5, 18, 122, 61)
    OLED.drawLine(5, 32, 122, 32)
    OLED.drawLine(5, 47, 122, 47)

    let xs = [38, 70, 101]
    let cargoLane = [randint(0, 2), randint(0, 2), randint(0, 2)]

    for (let i = 0; i < 3; i++) {
        let yy = 25
        if (cargoLane[i] == 1) yy = 39
        if (cargoLane[i] == 2) yy = 54
        OLED.drawRectangle(xs[i] - 3, yy - 4, xs[i] + 3, yy + 4)
    }

    let lane = randint(0, 2)
    let x = 10
    let oldY = 39
    let got = 0

    while (x < 116) {
        if (homePressed()) return

        let j = getGameJoy()
        if (j == JOY_UP) lane--
        if (j == JOY_DOWN) lane++
        lane = clamp(lane, 0, 2)

        let y = 39
        if (lane == 0) y = 25
        if (lane == 2) y = 54
        OLED.drawLine(x - 3, oldY, x, y)
        oldY = y
        if (x >= xs[0] - 6 && x <= xs[0] + 6 && lane == cargoLane[0]) got = got | 1
        if (x >= xs[1] - 6 && x <= xs[1] + 6 && lane == cargoLane[1]) got = got | 2
        if (x >= xs[2] - 6 && x <= xs[2] + 6 && lane == cargoLane[2]) got = got | 4

        tmShowNumber(got)
        showProgress(Math.idiv((x - 10) * 100, 106))

        x += 3
        basic.pause(120 - GAME_STAGE * 15)
    }

    let count = 0
    if ((got & 1) != 0) count++
    if ((got & 2) != 0) count++
    if ((got & 4) != 0) count++

    if (count >= 2) resultPage(true, 500 + count * 300)
    else resultPage(false, count * 150)
}

// ============================================================
// GAME 12: BOMB DEFUSE
// ============================================================

function bombDefuse(oledMode: boolean) {
    oledPage([
        "BOMB DEFUSE",
        "",
        "ROTATE ENCODER",
        "PRESS TO LOCK",
        "",
        "TARGET FIRST"
    ])

    let target = randint(10, 90)
    let value = 50

    tmShowNumber(target)
    if (oledMode) showProgress(target)
    else basic.showIcon(IconNames.Target)

    basic.pause(1100)

    while (true) {
        if (homePressed()) return

        let j = getGameJoy()
        if (j == JOY_LEFT) {
            value--
            value = clamp(value, 0, 99)
            basic.pause(35)
        }
        if (j == JOY_RIGHT) {
            value++
            value = clamp(value, 0, 99)
            basic.pause(35)
        }

        if (j == JOY_PRESS) {
            let err = absN(value - target)
            resultPage(err <= 5 - GAME_STAGE, clamp(1100 + GAME_STAGE * 100 - err * 30, 0, 1500))
            return
        }

        basic.pause(10)
    }
}

// ============================================================
// OLED GAME 13: PONG
// ============================================================

function oledPong() {
    OLED.clear()
    OLED.writeString("PONG")
    OLED.newLine()
    OLED.writeString("RANDOM BALL")
    OLED.newLine()
    OLED.drawRectangle(5, 18, 122, 61)

    let paddleY = randint(30, 50)
    let bx = randint(12, 28)
    let by = randint(24, 54)
    let dx = 3
    let dy = randint(0, 1) == 0 ? -2 : 2

    let maxSteps = 55 + GAME_STAGE * 10

    for (let step = 0; step < maxSteps; step++) {
        if (homePressed()) return

        let j = getGameJoy()
        if (j == JOY_UP) paddleY -= 3
        if (j == JOY_DOWN) paddleY += 3
        paddleY = clamp(paddleY, 25, 54)

        let ox = bx
        let oy = by
        bx += dx
        by += dy

        if (by <= 21 || by >= 58) dy = -dy
        if (bx <= 8) dx = -dx

        if (bx >= 116) {
            if (absN(by - paddleY) <= 9) {
                dx = -dx
                bx = 113
            } else {
                resultPage(false, step * 12)
                return
            }
        }
        OLED.drawLine(ox, oy, bx, by)
        OLED.drawLine(118, paddleY - 8, 118, paddleY + 8)

        tmShowNumber(step * 12)
        showProgress(Math.idiv(step * 100, maxSteps))
        basic.pause(110 - GAME_STAGE * 15)
    }

    resultPage(true, 1000 + GAME_STAGE * 200)
}

// ============================================================
// OLED GAME 14: BREAKOUT
// ============================================================

function oledBreakout() {
    OLED.clear()
    OLED.writeString("BREAKOUT")
    OLED.newLine()
    OLED.writeString("5 UNIQUE HITS")
    OLED.newLine()

    let shift = randint(0, 5)

    for (let i = 0; i < 5; i++) {
        OLED.drawRectangle(11 + shift + i * 21, 20, 26 + shift + i * 21, 27)
    }

    let alive = [1, 1, 1, 1, 1]
    let aim = 64
    let hit = 0
    let shots = 0
    let maxShots = 9 - GAME_STAGE
    if (maxShots < 6) maxShots = 6

    while (shots < maxShots && hit < 5) {
        if (homePressed()) return

        let j = getGameJoy()
        let e = encoderDelta()

        if (j == JOY_LEFT || e < 0) aim -= 4
        if (j == JOY_RIGHT || e > 0) aim += 4
        aim = clamp(aim, 12, 116)

        tmShowNumber(aim)

        if (j == JOY_PRESS || encoderPressed()) {
            shots++
            OLED.drawLine(64, 59, aim, 29)

            let brick = Math.idiv(clamp(aim - (11 + shift), 0, 104), 21)
            if (brick >= 0 && brick < 5 && alive[brick] == 1) {
                alive[brick] = 0
                hit++
            }

            showProgress(hit * 20)
            basic.pause(120)
        }

        basic.pause(10)
    }

    resultPage(hit >= 4, hit * 250)
}

// ============================================================
// OLED GAME 15: MISSILE DODGE
// ============================================================

function oledMissile() {
    OLED.clear()
    OLED.writeString("MISSILE DODGE")
    OLED.newLine()
    OLED.drawRectangle(5, 18, 122, 61)
    OLED.drawLine(5, 32, 122, 32)
    OLED.drawLine(5, 47, 122, 47)

    let lane = 1
    let x = 10
    let oldY = 39

    let m1Lane = randint(0, 2)
    let m2Lane = randint(0, 2)
    let m3Lane = randint(0, 2)

    OLED.drawRectangle(43, 22 + m1Lane * 14, 49, 27 + m1Lane * 14)
    OLED.drawRectangle(73, 22 + m2Lane * 14, 79, 27 + m2Lane * 14)
    OLED.drawRectangle(103, 22 + m3Lane * 14, 109, 27 + m3Lane * 14)

    while (x < 116) {
        if (homePressed()) return

        let j = getGameJoy()
        if (j == JOY_UP) lane--
        if (j == JOY_DOWN) lane++
        lane = clamp(lane, 0, 2)

        let y = lane == 0 ? 25 : lane == 1 ? 39 : 54
        OLED.drawLine(x - 3, oldY, x, y)
        oldY = y

        if (x >= 40 && x <= 52 && lane == m1Lane) { resultPage(false, 250); return }
        if (x >= 70 && x <= 82 && lane == m2Lane) { resultPage(false, 500); return }
        if (x >= 100 && x <= 112 && lane == m3Lane) { resultPage(false, 750); return }

        x += 3
        tmShowNumber(x * 8)
        showProgress(Math.idiv((x - 10) * 100, 106))
        basic.pause(90)
    }

    resultPage(true, 1200)
}
// ============================================================
// OLED GAME 16: FLAPPY DRONE
// ============================================================

function oledFlappy() {
    OLED.clear()
    OLED.writeString("FLAPPY DRONE")
    OLED.newLine()
    OLED.writeString("RANDOM GATES")
    OLED.newLine()
    OLED.drawRectangle(5, 18, 122, 61)

    let wallX = [40, 75, 108]
    let gapY = [randint(28, 50), randint(28, 50), randint(28, 50)]
    let halfGap = 6 - Math.idiv(GAME_STAGE - 1, 2)
    if (halfGap < 4) halfGap = 4

    for (let i = 0; i < 3; i++) {
        OLED.drawLine(wallX[i], 18, wallX[i], gapY[i] - halfGap)
        OLED.drawLine(wallX[i], gapY[i] + halfGap, wallX[i], 61)
    }

    let x = 12
    let y = randint(28, 50)

    while (x < 116) {
        if (homePressed()) return

        let j = getGameJoy()
        let ox = x
        let oy = y

        if (j == JOY_UP) y -= 4
        if (j == JOY_DOWN) y += 4

        y = clamp(y, 21, 58)
        x += 3

        OLED.drawLine(ox, oy, x, y)

        for (let i = 0; i < 3; i++) {
            if (x >= wallX[i] - 3 && x <= wallX[i] + 3) {
                if (!(y >= gapY[i] - halfGap && y <= gapY[i] + halfGap)) {
                    resultPage(false, x * 7)
                    return
                }
            }
        }

        tmShowNumber(x * 8)
        showProgress(Math.idiv((x - 12) * 100, 104))
        basic.pause(115 - GAME_STAGE * 15)
    }

    resultPage(true, 1150 + GAME_STAGE * 150)
}

// ============================================================
// OLED GAME 17: RADAR HUNT
// ============================================================

function oledRadar() {
    OLED.clear()
    OLED.writeString("RADAR HUNT")
    OLED.newLine()
    OLED.writeString("4-D + PRESS")
    OLED.newLine()
    OLED.drawRectangle(5, 18, 122, 61)
    OLED.drawLine(64, 18, 64, 61)
    OLED.drawLine(5, 40, 122, 40)

    let tx = randint(15, 112)
    let ty = randint(24, 56)
    let x = 15
    let y = 25

    for (let moves = 0; moves < 100; moves++) {
        if (homePressed()) return

        let j = getGameJoy()
        let ox = x
        let oy = y

        if (j == JOY_UP) y -= 3
        if (j == JOY_DOWN) y += 3
        if (j == JOY_LEFT) x -= 3
        if (j == JOY_RIGHT) x += 3

        x = clamp(x, 8, 120)
        y = clamp(y, 21, 59)

        if (x != ox || y != oy) OLED.drawLine(ox, oy, x, y)

        let dist = absN(x - tx) + absN(y - ty)
        tmShowNumber(dist)
        showProgress(clamp(100 - dist, 0, 100))

        if (j == JOY_PRESS || encoderPressed()) {
            if (dist <= 8) resultPage(true, 1000)
            else resultPage(false, clamp(800 - dist * 5, 0, 800))
            return
        }

        basic.pause(70)
    }

    resultPage(false, 100)
}

// ============================================================
// OLED GAME 18: FUEL RESCUE
// ============================================================

function oledFuel() {
    OLED.clear()
    OLED.writeString("FUEL RESCUE")
    OLED.newLine()
    OLED.writeString("RANDOM CELLS")
    OLED.newLine()
    OLED.drawRectangle(5, 18, 122, 61)

    let fx1 = randint(25, 45)
    let fy1 = randint(24, 55)
    let fx2 = randint(58, 82)
    let fy2 = randint(24, 55)
    let fx3 = randint(93, 113)
    let fy3 = randint(24, 55)

    OLED.drawRectangle(fx1 - 3, fy1 - 3, fx1 + 3, fy1 + 3)
    OLED.drawRectangle(fx2 - 3, fy2 - 3, fx2 + 3, fy2 + 3)
    OLED.drawRectangle(fx3 - 3, fy3 - 3, fx3 + 3, fy3 + 3)

    let x = 12
    let y = randint(25, 55)
    let got = 0
    let maxMoves = 165 - GAME_STAGE * 10

    for (let moves = 0; moves < maxMoves; moves++) {
        if (homePressed()) return

        let j = getGameJoy()
        let ox = x
        let oy = y

        if (j == JOY_UP) y -= 3
        if (j == JOY_DOWN) y += 3
        if (j == JOY_LEFT) x -= 3
        if (j == JOY_RIGHT) x += 3

        x = clamp(x, 8, 119)
        y = clamp(y, 21, 58)

        if (x != ox || y != oy) OLED.drawLine(ox, oy, x, y)

        if ((got & 1) == 0 && absN(x - fx1) <= 5 && absN(y - fy1) <= 5) got = got | 1
        if ((got & 2) == 0 && absN(x - fx2) <= 5 && absN(y - fy2) <= 5) got = got | 2
        if ((got & 4) == 0 && absN(x - fx3) <= 5 && absN(y - fy3) <= 5) got = got | 4

        tmShowNumber(got)
        let count = 0
        if ((got & 1) != 0) count++
        if ((got & 2) != 0) count++
        if ((got & 4) != 0) count++
        showProgress(count * 33)

        if (got == 7) {
            resultPage(true, clamp(1500 - moves * 3 + GAME_STAGE * 100, 300, 1800))
            return
        }

        basic.pause(65)
    }

    resultPage(false, 200)
}

// ============================================================
// GAME 19: NIGHT FLIGHT memory
// ============================================================

function nightFlight(oledMode: boolean) {
    oledPage([
        "NIGHT FLIGHT",
        "",
        "MEMORY TEST",
        "WATCH 5 CODES",
        "1U 2D 3L 4R",
        "THEN REPEAT"
    ])

    let seq: number[] = []

    for (let i = 0; i < 5; i++) {
        let v = randint(1, 4)
        seq.push(v)
        tmShowNumber(v)

        if (!oledMode) {
            if (v == 1) basic.showArrow(ArrowNames.North)
            if (v == 2) basic.showArrow(ArrowNames.South)
            if (v == 3) basic.showArrow(ArrowNames.West)
            if (v == 4) basic.showArrow(ArrowNames.East)
        } else {
            showProgress((i + 1) * 20)
        }

        basic.pause(650)
        if (!oledMode) basic.clearScreen()
        basic.pause(180)
    }

    tmShowNumber(0)

    for (let i = 0; i < 5; i++) {
        let got = 0

        while (got == 0) {
            if (homePressed()) return
            let j = getGameJoy()

            if (j == JOY_UP) got = 1
            if (j == JOY_DOWN) got = 2
            if (j == JOY_LEFT) got = 3
            if (j == JOY_RIGHT) got = 4

            basic.pause(10)
        }
        if (got != seq[i]) {
            resultPage(false, i * 200)
            return
        }

        tmShowNumber(i + 1)
        basic.pause(250)
    }

    resultPage(true, 1200)
}

// ============================================================
// GAME 20: EMERGENCY PILOT
// ============================================================

function emergencyPilot(oledMode: boolean) {
    oledPage([
        "EMERGENCY PILOT",
        "",
        "TARGET THROTTLE",
        "USE ENCODER",
        "PRESS TO HOLD",
        "STAY SAFE"
    ])

    let target = randint(35, 75)
    let throttle = 0
    let temp = 35

    tmShowNumber(target)
    basic.pause(900)

    while (true) {
        if (homePressed()) return

        let j = getGameJoy()
        if (j == JOY_UP || j == JOY_RIGHT) throttle += 1
        if (j == JOY_DOWN || j == JOY_LEFT) throttle -= 1
        throttle = clamp(throttle, 0, 100)

        if (throttle >= 80) temp++
        else if (temp > 35) temp--

        tmShowNumber(throttle)

        if (oledMode) showProgress(throttle)
        else {
            basic.clearScreen()
            let cols = Math.idiv(throttle + 19, 20)
            for (let x = 0; x < cols; x++) led.plot(x, 4)
        }

        if (temp >= 90) {
            resultPage(false, 100)
            return
        }

        if (j == JOY_PRESS) {
            let err = absN(throttle - target)
            resultPage(err <= 7 - GAME_STAGE, clamp(1100 + GAME_STAGE * 100 - err * 35, 0, 1500))
            return
        }

        basic.pause(50)
    }
}

// ============================================================
// MICROBIT GAME HELPERS
// ============================================================

function microHud(game: number) {
    oledPage([
        "MICROBIT PLAY",
        "GAME " + (game + 1),
        GAME_NAMES[game],
        "",
        "OLED = HUD",
        "P12 = HOME"
    ])
}

function mbGridGoal(game: number, obstacleMode: number) {
    microHud(game)

    let x = randint(0, 1)
    let y = randint(0, 4)
    let gx = randint(3, 4)
    let gy = randint(0, 4)
    let moves = 0
    let maxMoves = 70 - GAME_STAGE * 5

    while (moves < maxMoves) {
        if (homePressed()) return

        basic.clearScreen()

        if (obstacleMode == 1) {
            led.plotBrightness(2, 0, 80)
            led.plotBrightness(2, 1, 80)
            led.plotBrightness(2, 3, 80)
            led.plotBrightness(2, 4, 80)
        }

        if (obstacleMode == 2) {
            led.plotBrightness(1, 1, 80)
            led.plotBrightness(3, 1, 80)
            led.plotBrightness(1, 3, 80)
            led.plotBrightness(3, 3, 80)
        }

        led.plotBrightness(gx, gy, 80)
        led.plot(x, y)
        let j = getGameJoy()
        let nx = x
        let ny = y

        if (j == JOY_UP) ny--
        if (j == JOY_DOWN) ny++
        if (j == JOY_LEFT) nx--
        if (j == JOY_RIGHT) nx++

        nx = clamp(nx, 0, 4)
        ny = clamp(ny, 0, 4)

        let blocked = false

        if (obstacleMode == 1 && nx == 2 && ny != 2) blocked = true
        if (obstacleMode == 2 && ((nx == 1 || nx == 3) && (ny == 1 || ny == 3))) blocked = true

        if (!blocked) {
            x = nx
            y = ny
        }

        if (j != JOY_NONE) {
            moves++
            tmShowNumber(moves)
            basic.pause(110 - GAME_STAGE * 10)
        }

        if (x == gx && y == gy) {
            resultPage(true, 1100 + GAME_STAGE * 100 - moves * 10)
            return
        }

        basic.pause(10)
    }

    resultPage(false, 100)
}

function mbLaneGame(game: number, catchMode: boolean) {
    microHud(game)

    let player = randint(0, 4)
    let score = 0
    let rounds = 8 + GAME_STAGE * 2

    for (let round = 0; round < rounds; round++) {
        let obj = randint(0, 4)

        for (let y = 0; y <= 4; y++) {
            if (homePressed()) return

            let j = getGameJoy()
            if (j == JOY_LEFT) player--
            if (j == JOY_RIGHT) player++
            player = clamp(player, 0, 4)

            basic.clearScreen()
            led.plot(obj, y)
            led.plot(player, 4)

            basic.pause(190 - GAME_STAGE * 25)
        }

        if (catchMode) {
            if (player == obj) score++
        } else {
            if (player == obj) {
                resultPage(false, score * 100)
                return
            }
            score++
        }

        tmShowNumber(score * 100)
    }

    if (catchMode) {
        resultPage(score >= Math.idiv(rounds + 1, 2), score * 110)
    } else {
        resultPage(true, score * 110)
    }
}

function mbShooterGame(game: number) {
    microHud(game)

    let player = randint(0, 4)
    let score = 0
    let rounds = 5 + GAME_STAGE

    for (let round = 0; round < rounds; round++) {
        let target = randint(0, 4)
        let fired = false

        while (!fired) {
            if (homePressed()) return

            basic.clearScreen()
            led.plot(target, 0)
            led.plot(player, 4)

            let j = getGameJoy()

            if (j == JOY_LEFT) player--
            if (j == JOY_RIGHT) player++
            player = clamp(player, 0, 4)

            if (j == JOY_PRESS || encoderPressed()) {
                fired = true
                if (player == target) score++
            }

            basic.pause(95 - GAME_STAGE * 10)
        }
        tmShowNumber(score * 100)
    }

    resultPage(score >= Math.idiv(rounds + 1, 2), score * 140)
}

function mbLandingGame(game: number) {
    microHud(game)

    let x = randint(0, 4)
    let target = randint(0, 4)

    for (let y = 0; y <= 4; y++) {
        if (homePressed()) return

        let j = getGameJoy()
        if (j == JOY_LEFT) x--
        if (j == JOY_RIGHT) x++
        x = clamp(x, 0, 4)

        basic.clearScreen()
        led.plot(x, y)
        led.plotBrightness(target, 4, 70)

        basic.pause(420 - GAME_STAGE * 55)
    }

    resultPage(x == target, x == target ? 1100 + GAME_STAGE * 100 : 200)
}

function mbSnakeGame(game: number) {
    microHud(game)

    let x = 2
    let y = 2
    let dx = 1
    let dy = 0
    let fx = randint(0, 4)
    let fy = randint(0, 4)

    for (let step = 0; step < 35; step++) {
        if (homePressed()) return

        let j = getGameJoy()

        if (j == JOY_UP) { dx = 0; dy = -1 }
        if (j == JOY_DOWN) { dx = 0; dy = 1 }
        if (j == JOY_LEFT) { dx = -1; dy = 0 }
        if (j == JOY_RIGHT) { dx = 1; dy = 0 }

        x += dx
        y += dy

        if (x < 0 || x > 4 || y < 0 || y > 4) {
            resultPage(false, step * 20)
            return
        }

        basic.clearScreen()
        led.plotBrightness(fx, fy, 80)
        led.plot(x, y)

        if (x == fx && y == fy) {
            resultPage(true, 1000)
            return
        }

        tmShowNumber(step)
        basic.pause(220)
    }

    resultPage(false, 250)
}

function mbPongGame(game: number) {
    microHud(game)

    let paddle = randint(0, 4)
    let bx = randint(0, 4)
    let by = 0
    let dx = randint(0, 1) == 0 ? -1 : 1
    if (bx == 0) dx = 1
    if (bx == 4) dx = -1
    let dy = 1

    let maxSteps = 45 + GAME_STAGE * 10

    for (let step = 0; step < maxSteps; step++) {
        if (homePressed()) return

        let j = getGameJoy()
        if (j == JOY_LEFT) paddle--
        if (j == JOY_RIGHT) paddle++
        paddle = clamp(paddle, 0, 4)

        bx += dx
        by += dy

        if (bx <= 0 || bx >= 4) dx = -dx
        if (by <= 0) dy = 1

        if (by >= 4) {
            if (bx == paddle) {
                dy = -1
                by = 3
            } else {
                resultPage(false, step * 12)
                return
            }
        }

        basic.clearScreen()
        led.plot(bx, by)
        led.plot(paddle, 4)
        tmShowNumber(step * 12)

        basic.pause(165 - GAME_STAGE * 20)
    }

    resultPage(true, 1100 + GAME_STAGE * 150)
}

function mbFlappyGame(game: number) {
    microHud(game)

    let y = randint(0, 4)
    let score = 0
    let rounds = 6 + GAME_STAGE * 2

    for (let round = 0; round < rounds; round++) {
        let gap = randint(0, 4)

        for (let x = 4; x >= 0; x--) {
            if (homePressed()) return

            let j = getGameJoy()
            if (j == JOY_UP) y--
            if (j == JOY_DOWN) y++
            y = clamp(y, 0, 4)

            basic.clearScreen()

            for (let gy = 0; gy < 5; gy++) {
                if (gy != gap) led.plotBrightness(x, gy, 70)
            }

            led.plot(0, y)

            if (x == 0 && y != gap) {
                resultPage(false, score * 100)
                return
            }

            basic.pause(180 - GAME_STAGE * 20)
        }

        score++
        tmShowNumber(score * 100)
    }

    resultPage(true, 1100 + GAME_STAGE * 150)
}

function runOLEDGame(game: number) {
    if (game == 0) oledWallEscape()
    else if (game == 1) oledMazeEscape()
    else if (game == 2) oledSlowJump()
    else if (game == 3) oledFalling()
    else if (game == 4) oledShooter()
    else if (game == 5) oledHighway()
    else if (game == 6) oledLanding()
    else if (game == 7) oledSnake()
    else if (game == 8) oledTarget()
    else if (game == 9) reactionGame(true)
    else if (game == 10) oledCargo()
    else if (game == 11) bombDefuse(true)
    else if (game == 12) oledPong()
    else if (game == 13) oledBreakout()
    else if (game == 14) oledMissile()
    else if (game == 15) oledFlappy()
    else if (game == 16) oledRadar()
    else if (game == 17) oledFuel()
    else if (game == 18) nightFlight(true)
    else if (game == 19) emergencyPilot(true)
}

function runMicroGame(game: number) {
    if (game == 0) mbGridGoal(game, 1)
    else if (game == 1) mbGridGoal(game, 2)
    else if (game == 2) mbGridGoal(game, 1)
    else if (game == 3) mbLaneGame(game, true)
    else if (game == 4) mbShooterGame(game)
    else if (game == 5) mbLaneGame(game, false)
    else if (game == 6) mbLandingGame(game)
    else if (game == 7) mbSnakeGame(game)
    else if (game == 8) mbGridGoal(game, 0)
    else if (game == 9) reactionGame(false)
    else if (game == 10) mbLaneGame(game, true)
    else if (game == 11) bombDefuse(false)
    else if (game == 12) mbPongGame(game)
    else if (game == 13) mbShooterGame(game)
    else if (game == 14) mbLaneGame(game, false)
    else if (game == 15) mbFlappyGame(game)
    else if (game == 16) mbGridGoal(game, 0)
    else if (game == 17) mbGridGoal(game, 2)
    else if (game == 18) nightFlight(false)
    else if (game == 19) emergencyPilot(false)
}


function showGameStage(game: number, screen: number, lives: number, totalScore: number) {
    OLED.clear()
    OLED.writeString("DJI GAME // RANDOM")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    OLED.writeString(GAME_NAMES[game])
    OLED.newLine()
    OLED.writeString("STAGE ")
    OLED.writeNum(GAME_STAGE)
    OLED.writeString("/")
    OLED.writeNum(GAME_TOTAL_STAGES)
    OLED.newLine()
    OLED.writeString("LIVES ")
    OLED.writeNum(lives)
    OLED.newLine()
    OLED.writeString("TOTAL ")
    OLED.writeNum(totalScore)
    OLED.newLine()
    if (screen == 0) OLED.writeString("OLED MODE")
    else OLED.writeString("MICROBIT MODE")

    tmShowNumber(GAME_STAGE * 100 + lives)
    basic.pause(700)
}

function finishGameCampaign(game: number, win: boolean, totalScore: number) {
    OLED.clear()

    if (win) {
        OLED.writeString("GAME COMPLETE")
        OLED.newLine()
        OLED.writeString("----------------")
        OLED.newLine()
        OLED.writeString(GAME_NAMES[game])
        OLED.newLine()
        OLED.writeString("3 RANDOM STAGES")
        OLED.newLine()
        OLED.writeString("TOTAL SCORE")
        OLED.newLine()
        OLED.writeNum(totalScore)
        basic.showIcon(IconNames.Yes)
    } else {
        OLED.writeString("GAME OVER")
        OLED.newLine()
        OLED.writeString("----------------")
        OLED.newLine()
        OLED.writeString(GAME_NAMES[game])
        OLED.newLine()
        OLED.writeString("TRY NEW RANDOM")
        OLED.newLine()
        OLED.writeString("TOTAL SCORE")
        OLED.newLine()
        OLED.writeNum(totalScore)
        basic.showIcon(IconNames.No)
    }

    tmShowNumber(totalScore)
    basic.pause(500)

    while (true) {
        if (homePressed()) return
        if (getGameJoy() == JOY_PRESS || encoderPressed()) return
        basic.pause(15)
    }
}

function runGameCampaign(game: number, screen: number) {
    GAME_STAGE = 1
    let lives = 3
    let totalScore = 0

    while (GAME_STAGE <= GAME_TOTAL_STAGES && lives > 0) {
        showGameStage(game, screen, lives, totalScore)

        GAME_RESULT_READY = false
        GAME_RESULT_WIN = false
        GAME_RESULT_SCORE = 0

        if (screen == 0) runOLEDGame(game)
        else runMicroGame(game)

        // If no result was recorded, P12/Home was used inside the game.
        if (!GAME_RESULT_READY) return

        if (GAME_RESULT_WIN) {
            totalScore += GAME_RESULT_SCORE
            GAME_STAGE++
        } else {
            lives--

            if (lives > 0) {
                OLED.clear()
                OLED.writeString("RETRY STAGE")
                OLED.newLine()
                OLED.writeString("NEW RANDOM MAP")
                OLED.newLine()
                OLED.writeString("LIVES ")
                OLED.writeNum(lives)
                tmShowNumber(lives)
                basic.pause(750)
            }
        }
    }

    if (GAME_STAGE > GAME_TOTAL_STAGES) {
        finishGameCampaign(game, true, totalScore)
    } else {
        finishGameCampaign(game, false, totalScore)
    }
}

function gamesSystem() {
    led.enable(true)
    OLED.init(128, 64)
    while (true) {
        let game = chooseGame()
        if (game < 0) return

        let screen = choosePlayScreen()
        if (screen < 0) continue

        runGameCampaign(game, screen)
    }
}

// ============================================================
// DJI FLY
// ============================================================

function flightModeName(mode: number): string {
    if (mode == 0) return "C"
    if (mode == 1) return "N"
    if (mode == 2) return "S"
    return "M"
}

function throttleBar(throttle: number): string {
    let blocks = Math.idiv(clamp(throttle, 0, 100), 10)
    let s = "["
    for (let i = 0; i < 10; i++) {
        if (i < blocks) s = s + "#"
        else s = s + "-"
    }
    return s + "]"
}

function flightPage(mode: number, throttle: number, speed: number, boost: boolean) {
    OLED.clear()
    OLED.writeString("DJI PRO FLIGHT")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()

    OLED.writeString("MODE ")
    OLED.writeString(flightModeName(mode))
    OLED.newLine()

    OLED.writeString("THROTTLE ")
    OLED.writeNum(throttle)
    OLED.writeString("%")
    OLED.newLine()

    OLED.writeString(throttleBar(throttle))
    OLED.newLine()

    OLED.writeString("SPEED ")
    OLED.writeNum(speed)
    OLED.newLine()

    if (boost) OLED.writeString("STATUS BOOST")
    else OLED.writeString("STATUS READY")
    OLED.newLine()

    OLED.writeString("L/R MODE U/D THR")
    OLED.newLine()
    OLED.writeString("A+B = HOME")
}

function warningPage(temp: number) {
    OLED.clear()
    OLED.writeString("DJI PRO WARNING")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    OLED.writeString("OVERHEAT")
    OLED.newLine()
    OLED.writeString("TEMP ")
    OLED.writeNum(temp)
    OLED.writeString("C")
    OLED.newLine()
    OLED.writeString("POWER LIMITED")
    OLED.newLine()
    OLED.writeString("COOLING...")
}

function djiFly() {
    // Re-enable the micro:bit 5x5 when leaving the rain sensor page.
    led.enable(true)
    OLED.init(128, 64)

    let mode = 1
    let throttle = 0
    let speed = 0
    let temp = 35
    let warning = false
    let boost = false

    let modeArmed = true

    let lastMode = -1
    let lastThrottle = -999
    let lastSpeed = -999
    let lastBoost = false
    let lastDraw = 0

    flightPage(mode, throttle, speed, false)
    techMiniScreen(throttle, mode, false, false)

    lastMode = mode
    lastThrottle = throttle
    lastSpeed = speed

    while (true) {
        if (homePressed()) {
            basic.clearScreen()
            return
        }

        let j = getJoy()

        // Hold UP = throttle increases continuously.
        // Hold DOWN = throttle decreases continuously.
        if (j == JOY_UP) throttle += 2
        if (j == JOY_DOWN) throttle -= 2
        throttle = clamp(throttle, 0, 100)

        // LEFT / RIGHT changes mode once; return to center before another change.
        if (modeArmed) {
            if (j == JOY_LEFT) {
                mode--
                if (mode < 0) mode = 3
                modeArmed = false
            } else if (j == JOY_RIGHT) {
                mode++
                if (mode > 3) mode = 0
                modeArmed = false
            }
        } else if (j == JOY_NONE) {
            modeArmed = true
        }

        boost = j == JOY_PRESS

        let factor = 1
        if (mode == 0) factor = 1
        if (mode == 1) factor = 2
        if (mode == 2) factor = 3
        if (mode == 3) factor = 4

        speed = throttle * factor
        if (boost) speed += 40

        if (throttle >= 85 || boost) {
            if (temp < 99) temp++
        } else if (throttle < 60 && temp > 35) {
            temp--
        }

        if (!warning && temp >= 88) {
            warning = true
            warningPage(temp)
            techMiniScreen(throttle, mode, boost, true)
        }

        if (warning) {
            throttle = clamp(throttle, 0, 55)

            if (temp > 35) temp--

            if (temp <= 68) {
                warning = false
                speed = throttle * factor

                flightPage(mode, throttle, speed, false)
                techMiniScreen(throttle, mode, false, false)

                lastMode = mode
                lastThrottle = throttle
                lastSpeed = speed
                lastBoost = false
                lastDraw = control.millis()
            }

            basic.pause(90)
            continue
        }

        let needsDraw =
            mode != lastMode ||
            absN(throttle - lastThrottle) >= 2 ||
            absN(speed - lastSpeed) >= 4 ||
            boost != lastBoost

        if (needsDraw && control.millis() - lastDraw >= 90) {
            flightPage(mode, throttle, speed, boost)
            techMiniScreen(throttle, mode, boost, false)

            lastMode = mode
            lastThrottle = throttle
            lastSpeed = speed
            lastBoost = boost
            lastDraw = control.millis()
        }

        basic.pause(45)
    }
}

// ============================================================
// RAIN
// ============================================================
// ============================================================

function readRainAO(): number {
    return 0 // analog channel unused
}

function readRainDO(): number {
    let high = 0
    for (let i = 0; i < 7; i++) {
        if (pins.digitalReadPin(RAIN_DO) == 1) high++
        basic.pause(4)
    }
    if (high >= 4) return 1
    return 0
}

function calibrateRain() {
    OLED.clear()
    OLED.writeString("RAIN CALIBRATE")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    OLED.writeString("KEEP SENSOR DRY")
    OLED.newLine()
    OLED.writeString("MEASURING...")
    basic.pause(700)
    rainDryAO = readRainAO()
    rainDryDO = readRainDO()
    rainState = false
    rainWetCount = 0
    rainDryCount = 0
    basic.pause(250)
}

function drawRainState(state: boolean) {
    OLED.clear()
    OLED.writeString("RAIN SENSOR")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    OLED.newLine()
    if (state) {
        OLED.writeString("   RAINING")
        OLED.newLine()
        OLED.newLine()
        OLED.writeString("   RAIN ALERT")
    } else {
        OLED.writeString("   NO RAIN")
        OLED.newLine()
        OLED.newLine()
        OLED.writeString("   WEATHER OK")
    }
    OLED.newLine()
    OLED.newLine()
    OLED.writeString("PRESS = BACK")
}

// Light the entire 5x5 red matrix only while rain is detected.
function rainLights(on: boolean) {
    if (on) {
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) led.plot(x, y)
        }
    } else {
        basic.clearScreen()
    }
}

function rainPage() {
    led.enable(true)
    OLED.init(128, 64)
    rainWetCount = 0
    rainDryCount = 0
    rainState = readRainDO() == 0
    drawRainState(rainState)
    rainLights(rainState)

    while (getJoy() == JOY_PRESS) basic.pause(10)
    while (true) {
        if (homePressed()) {
            rainLights(false)
            return
        }
        if (getJoy() == JOY_PRESS) {
            while (getJoy() == JOY_PRESS) basic.pause(10)
            rainLights(false)
            return
        }

        let wet = readRainDO() == 0
        if (wet) {
            rainWetCount++
            rainDryCount = 0
        } else {
            rainDryCount++
            rainWetCount = 0
        }
        if (!rainState && rainWetCount >= 3) {
            rainState = true
            drawRainState(true)
            rainLights(true)
        } else if (rainState && rainDryCount >= 8) {
            rainState = false
            drawRainState(false)
            rainLights(false)
        }
        basic.pause(80)
    }
}

function filesSystem() {
    while (true) {
        OLED.clear()
        OLED.writeString("RAIN")
        OLED.newLine()
        OLED.writeString("----------------")
        OLED.newLine()
        OLED.writeString("> RAIN SENSOR")
        OLED.newLine()
        OLED.newLine()
        OLED.writeString("PRESS = OPEN")
        OLED.newLine()
        OLED.writeString("A+B = BACK")

        while (true) {
            if (homePressed()) return
            let j = getMenuJoy()
            if (j == JOY_PRESS) {
                rainPage()
                menuJoyArmed = false
                while (!joystickCentered()) basic.pause(10)
                basic.pause(60)
                menuJoyArmed = true
                break
            }
            basic.pause(10)
        }
    }
}

// ============================================================
// FIRE SENSOR - AO=P16, DO=NOT CONNECTED
// ============================================================
function drawFireState(state: boolean) {
    OLED.clear()
    OLED.writeString("FIRE SENSOR")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    OLED.newLine()
    if (state) {
        OLED.writeString("   !!! FIRE !!!")
        OLED.newLine()
        OLED.newLine()
        OLED.writeString(" FIRE DETECTED")
        basic.showIcon(IconNames.Skull)
    } else {
        OLED.writeString("   NO FIRE")
        OLED.newLine()
        OLED.newLine()
        OLED.writeString("   AREA SAFE")
        basic.clearScreen()
    }
    OLED.newLine()
    OLED.newLine()
    OLED.writeString("PRESS = BACK")
}

function firePage() {
    OLED.init(128, 64)
    OLED.clear()
    OLED.writeString("FIRE SENSOR")
    OLED.newLine()
    OLED.writeString("----------------")
    OLED.newLine()
    OLED.writeString("CALIBRATING...")
    OLED.newLine()
    OLED.writeString("NO FLAME PLEASE")
    basic.pause(800)

    let fireBase = avgAnalog(AnalogPin.P16, 15)
    let fireState = false
    let fireCount = 0
    let safeCount = 0
    drawFireState(false)

    while (getJoy() == JOY_PRESS) basic.pause(10)

    while (true) {
        if (homePressed()) {
            basic.clearScreen()
            OLED.init(128, 64)
            return
        }
        if (getJoy() == JOY_PRESS) {
            while (getJoy() == JOY_PRESS) basic.pause(10)
            basic.clearScreen()
            OLED.init(128, 64)
            return
        }

        let fireAO = avgAnalog(AnalogPin.P16, 8)
        let fireDelta = absN(fireAO - fireBase)
        let flameNow = fireDelta >= 80

        if (flameNow) {
            fireCount++
            safeCount = 0
        } else {
            fireCount = 0
            safeCount++
        }

        if (!fireState && fireCount >= 3) {
            fireState = true
            fireCount = 0
            drawFireState(true)
        }
        if (fireState && safeCount >= 8) {
            fireState = false
            safeCount = 0
            drawFireState(false)
        }
        basic.pause(100)
    }
}

// ============================================================
// INIT
// ============================================================

led.enable(true)

pins.setPull(JOY_SW, PinPullMode.PullUp)
pins.setPull(RAIN_DO, PinPullMode.PullUp)

OLED.init(128, 64)

djiBoot()
OLED.clear()
OLED.writeString("KEEP JOYSTICK CENTERED")
basic.pause(700)
joyCenterX = avgAnalog(JOY_X, 20)
joyCenterY = avgAnalog(JOY_Y, 20)
joySwitchIdle = pins.digitalReadPin(JOY_SW)
menuJoyArmed = true

while (true) {
    let choice = mainMenu()

    if (choice == 0) gamesSystem()
    else if (choice == 1) djiFly()
    else if (choice == 2) rainPage()
    else if (choice == 3) firePage()

    menuJoyArmed = false
    while (!joystickCentered()) basic.pause(10)
    basic.pause(80)
    menuJoyArmed = true
}
