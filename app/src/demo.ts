import { withinViewportAsync } from '../../package/src/async/index'
import { withinViewport } from '../../package/src/sync/index'
import { isSide } from '../../package/src/common/sides'
import { Side } from '../../package/src/common/common.types'

const wvOptions: Record<Side, number> = {
    all: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
}

const sides: Side[] = ['top', 'left', 'bottom', 'right']

// Query function that returns a proper array
function query(selector: string, node?: HTMLElement): Array<HTMLElement> {
    if (typeof node === 'undefined') {
        node = document.body
    }

    return Array.from(node.querySelectorAll(selector))
}

function showAll(selector: string) {
    query(selector).forEach((elem) => {
        elem.style.display = elem.nodeName === 'SPAN' ? 'inline' : 'block'
    })
}

function hideAll(selector: string) {
    query(selector).forEach((elem) => {
        elem.style.display = 'none'
    })
}

function triggerEvent(node: HTMLElement | null, eventName: string) {
    if (!node) {
        return
    }

    // Modern browsers (as of the 2020s)
    if (typeof Event !== 'undefined') {
        node.dispatchEvent(new Event(eventName, { bubbles: true, cancelable: true }))
    }
    // The first generation of standards-compliant browsers (not IE) from the 2000s
    else if (document.createEvent) {
        const evt = document.createEvent('HTMLEvents')

        if ('initEvent' in evt) {
            evt.initEvent(eventName, true, true)
        }

        if ('eventName' in evt) {
            evt.eventName = eventName
        }

        node.dispatchEvent(evt)
    }
    // IE
    else if ('createEventObject' in document && typeof document.createEventObject === 'function') {
        const evt = document.createEventObject()

        evt.eventType = eventName

        if ('fireEvent' in node && typeof node.fireEvent === 'function') {
            node.fireEvent('on' + evt.eventType, evt)
        }
    }
}

const areViewportUnitsSupported = (function () {
    try {
        const div = document.createElement('div')
        div.style.width = '50vw'
        document.body.appendChild(div)

        const elemWidth = parseInt(getComputedStyle(div, null).width, 10)
        const halfWidth = parseInt(String(window.innerWidth / 2), 10)

        return elemWidth === halfWidth
    } catch (e) {
        console.error('[areViewportUnitsSupported] ', e)
        return false
    }
})()

function determineBoxWidth() {
    if (areViewportUnitsSupported) {
        return '23vw'
    }

    let boxWidth = 20

    // Make sure the demo will be wider than the device's screen so that vertical scroll bars appear
    //    but not so wide that you can't see at least four on screen at a time with a maximized browser window
    if (screen.width >= screen.height) {
        // Screen is wide/landscape
        boxWidth = parseInt(String((screen.width + 400) / 10), 10)
    } else {
        boxWidth = parseInt(String((screen.height + 400) / 10), 10)
    }

    return `${boxWidth}px`
}

function isFlexboxSupported() {
    return document.createElement('p').style.flex === ''
}

// Demo code
function demo() {
    let $boxes: HTMLElement[] = []
    let sideStrategy: 'all' | 'independent' = 'all'
    let method: 'async' | 'sync' = 'async'

    // This is the container that we're using as the viewport. If it's some DOM element, these are both the same. But if it's the whole window, then we need to use either `window` or `document.body` for certain tasks.
    let containerForDOM: HTMLElement = document.body
    let containerForEvents: Window | HTMLElement = window

    function init() {
        createBoxHtml()
        eventsInit()
    }

    function createBoxHtml() {
        const boxCount = 200
        let boxHTML = ''
        const boxWidth = determineBoxWidth()

        // Add a container and put the boxes inside
        const boxContainer = document.createElement('div')
        boxContainer.id = 'boxContainer'

        if (isFlexboxSupported()) {
            let i = 0
            // Generate boxes which will each be tested for their viewport within-ness
            while (i < boxCount) {
                boxHTML += '<div aria-hidden="false">&nbsp;</div>'

                i++
            }

            boxContainer.classList.add('flex')
        } else {
            let i = 0
            while (i < boxCount) {
                // Set the styles so everything is nice and proportional to this device's screen
                boxHTML +=
                    '<div aria-hidden="false" style="width:' +
                    boxWidth +
                    ';height:' +
                    boxWidth +
                    ';line-height:' +
                    boxWidth +
                    ';">&nbsp;</div>'
                i++
            }

            boxContainer.classList.add('no-flex')
            boxContainer.style.cssText = 'width:' + (parseInt(boxWidth, 10) * 10 + 20) + 'px;'
        }

        boxContainer.innerHTML = boxHTML
        containerForDOM.appendChild(boxContainer)

        $boxes = query('div', boxContainer)

        eventsInit()

        // Update the <div>s for the first time
        updateBoxes()
    }

    ////////////
    // Events //
    ////////////

    // Setup event listeners
    function eventsInit() {
        // Scroll or resize the viewport
        containerForEvents.addEventListener('resize', updateBoxes)
        containerForEvents.addEventListener('scroll', updateBoxes)

        // Method radio buttons
        query('[name="method-form"]').forEach((elem) => {
            elem.addEventListener('change', onMethodChange)
        })

        // Container radio buttons
        query('[name="container-form"]').forEach((elem) => {
            elem.addEventListener('change', onContainerFormChange)
        })

        // Threshold radio buttons
        query('[name="side-strategy"]').forEach((elem) => {
            elem.addEventListener('change', onSideStrategyChange)
        })

        // Threshold number entry
        query('input[type="number"]').forEach((elem) => {
            elem.addEventListener('keyup', onBoundaryChange)
            elem.addEventListener('change', onBoundaryChange)
            // 'click' is for spinners on input[number] control
            elem.addEventListener('click', onBoundaryChange)
        })

        // Nudge controls
        // Only certain combinations of browsers/OSes allow capturing arrow key strokes, unfortunately
        // Windows: Firefox, Trident, Safari, Opera; Mac: Chrome, Safari, Opera; Not Firefox
        if (
            ('oscpu' in navigator &&
                navigator.oscpu &&
                typeof navigator.oscpu === 'string' &&
                /Windows/.test(navigator.oscpu) &&
                /Firefox|Trident|Safari|Presto/.test(navigator.userAgent)) ||
            (/Macintosh/.test(navigator.userAgent) && /Chrome|Safari|Presto/.test(navigator.userAgent))
        ) {
            document.body.addEventListener('keydown', onNudge)
            showAll('.nudge-instructions')
        }

        // Controls toggler
        document.getElementById('toggler')?.addEventListener('click', onControlsToggle)
    }

    function removeEvents() {
        // Scroll or resize the viewport
        containerForEvents.removeEventListener('resize', updateBoxes)
        containerForEvents.removeEventListener('scroll', updateBoxes)

        // Method radio buttons
        query('[name="method-form"]').forEach((elem) => {
            elem.removeEventListener('change', onMethodChange)
        })

        // Container radio buttons
        query('[name="container-form"]').forEach((elem) => {
            elem.removeEventListener('change', onContainerFormChange)
        })

        // Threshold radio buttons
        query('[name="side-strategy"]').forEach((elem) => {
            elem.removeEventListener('change', onSideStrategyChange)
        })

        // User entry
        query('input[type="number"]').forEach((elem) => {
            elem.removeEventListener('keyup', onBoundaryChange)
            elem.removeEventListener('change', onBoundaryChange)
            // 'click' is for spinners on input[number] control
            elem.removeEventListener('click', onBoundaryChange)
        })

        // Nudge controls
        // Only certain combinations of browsers/OSes allow capturing arrow key strokes, unfortunately
        // Windows: Firefox, Trident, Safari, Opera; Mac: Chrome, Safari, Opera; Not Firefox
        if (
            ('oscpu' in navigator &&
                navigator.oscpu &&
                typeof navigator.oscpu === 'string' &&
                /Windows/.test(navigator.oscpu) &&
                /Firefox|Trident|Safari|Presto/.test(navigator.userAgent)) ||
            (/Macintosh/.test(navigator.userAgent) && /Chrome|Safari|Presto/.test(navigator.userAgent))
        ) {
            document.body.removeEventListener('keydown', onNudge)
            showAll('.nudge-instructions')
        }

        // Controls toggler
        document.getElementById('toggler')?.removeEventListener('click', onControlsToggle)
    }

    // When the method/version radio buttons change
    function onMethodChange(evt: Event) {
        // TODO - Make TS work properly with DOM events
        const target = evt.target as HTMLInputElement | null
        const whichRadio = target?.value ?? ''

        if (whichRadio === 'async') {
            method = 'async'
        } else {
            method = 'sync'
        }

        // Update the page
        updateBoxes()
    }

    // When the container radio buttons change
    function onContainerFormChange(evt: Event) {
        // TODO - Make TS work properly with DOM events
        const target = evt.target as HTMLInputElement | null
        const whichRadio = target?.value ?? ''

        removeEvents()

        // Remove any previously-existing box containers
        const boxContainer = document.getElementById('boxContainer')

        if (boxContainer) {
            boxContainer.parentNode?.removeChild(boxContainer)
        }

        const viewportContainer = document.getElementById('container')

        if (whichRadio === 'window') {
            containerForDOM = document.body
            containerForEvents = window

            if (viewportContainer) {
                viewportContainer.style.display = 'none'
            }
        } else {
            if (viewportContainer) {
                containerForDOM = viewportContainer
                containerForEvents = viewportContainer
                containerForDOM.style.display = 'block'
            }
        }

        // Update the page
        createBoxHtml()
    }

    // When the threshold radio buttons change
    function onSideStrategyChange(evt: Event) {
        // TODO - Make TS work properly with DOM events
        const target = evt.target as HTMLInputElement | null
        const whichRadio = target?.value ?? ''

        if (whichRadio === 'independent') {
            sideStrategy = 'independent'
            hideAll('.all-sides-wrapper')
            showAll('.independent-sides-wrapper')
            sides.forEach((side) => {
                triggerEvent(document.getElementById(side), 'change')
            })
            query('.side-strategy-group-1')[0].classList.remove('selected')
            query('.side-strategy-group-2')[0].classList.add('selected')
        } else {
            sideStrategy = 'all'
            hideAll('.independent-sides-wrapper')
            showAll('.all-sides-wrapper')
            triggerEvent(document.getElementById('all'), 'change')
            query('.side-strategy-group-2')[0].classList.remove('selected')
            query('.side-strategy-group-1')[0].classList.add('selected')
        }

        // Update the page
        updateBoxes()
    }

    // When a boundary value changes
    function onBoundaryChange(evt: Event) {
        // TODO - Make TS work properly with DOM events
        const target = evt.target as HTMLInputElement | null
        const val = parseInt(target?.value ?? '', 10)
        const side = target?.id

        if (!isSide(side)) {
            throw new Error('Input ID must be a valid side')
        }

        // Positive value was entered (negative values are allowed, but the boundaries would be off screen)
        if (val > 0) {
            if (side === 'all') {
                showAll(`.boundary-top`)
                showAll(`.boundary-right`)
                showAll(`.boundary-bottom`)
                showAll(`.boundary-left`)
            } else {
                showAll(`.boundary-${side}`)
            }

            drawBound(side, val)
        }
        // Hide boundaries
        else {
            hideAll(`.boundary-${side}`)
        }

        // Update the page
        wvOptions[side] = val
        updateBoxes()
    }

    // When shift + arrow key is pressed, nudge the page by 1px
    function onNudge(evt: KeyboardEvent) {
        // TODO - Make TS work properly with DOM events
        const target = evt.target as HTMLInputElement | null

        // Ignore input fields
        if (target?.nodeName === 'INPUT') {
            return true
        }

        if (!evt.shiftKey) {
            return
        }

        let code = evt.code

        if (typeof code === 'undefined' && 'keyCode' in evt) {
            switch (evt.keyCode) {
                case 37: {
                    code = 'ArrowLeft'
                    break
                }
                case 38: {
                    code = 'ArrowUp'
                    break
                }
                case 39: {
                    code = 'ArrowRight'
                    break
                }
                case 40: {
                    code = 'ArrowDown'
                    break
                }
                default: {
                    // Some other, non-arrow key was pressed
                    break
                }
            }
        }

        if (!code || !/^Arrow\w+/.test(code)) {
            return
        }

        const scrollVals: Record<string, [number, number]> = {
            ArrowUp: [0, -1],
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowDown: [0, 1],
        }

        containerForEvents.scrollBy(scrollVals[code][0], scrollVals[code][1])

        evt.preventDefault()
    }

    function onControlsToggle() {
        document.querySelector('.explanation')?.classList.toggle('collapsed')

        const toggler = document.getElementById('toggler')

        if (!toggler) {
            return
        }

        toggler.classList.toggle('plus')
        toggler.classList.toggle('minus')

        if (toggler.innerHTML === 'Collapse') {
            toggler.innerHTML = 'Expand'
        } else {
            toggler.innerHTML = 'Collapse'
        }
    }

    function drawTopBoundary(distStr: string) {
        query('.boundary-top').forEach((elem) => {
            elem.style.top = distStr
            elem.style.height = distStr
            elem.style.marginTop = `-${distStr}`
        })
    }

    function drawRightBoundary(distStr: string) {
        query('.boundary-right').forEach((elem) => {
            elem.style.right = distStr
            elem.style.width = distStr
            elem.style.marginRight = `-${distStr}`
        })
    }

    function drawBottomBoundary(distStr: string) {
        query('.boundary-bottom').forEach((elem) => {
            elem.style.bottom = distStr
            elem.style.height = distStr
            elem.style.marginBottom = `-${distStr}`
        })
    }

    function drawLeftBoundary(distStr: string) {
        query('.boundary-left').forEach((elem) => {
            elem.style.left = distStr
            elem.style.width = distStr
            elem.style.marginLeft = `-${distStr}`
        })
    }

    // Overlay a boundary line on the viewport when one is set by the user
    function drawBound(side: Side, dist: number) {
        const distStr = `${dist}px`

        switch (side) {
            case 'top': {
                drawTopBoundary(distStr)
                break
            }

            case 'right': {
                drawRightBoundary(distStr)
                break
            }

            case 'bottom': {
                drawBottomBoundary(distStr)
                break
            }

            case 'left': {
                drawLeftBoundary(distStr)
                break
            }

            default: {
                drawTopBoundary(distStr)
                drawRightBoundary(distStr)
                drawBottomBoundary(distStr)
                drawLeftBoundary(distStr)
                break
            }
        }
    }

    function setBoxIsIn(box: HTMLElement) {
        box.innerHTML = 'in'
        box.setAttribute('aria-hidden', 'false')
        box.classList.add('inview')
    }

    function setBoxIsOut(box: HTMLElement) {
        box.innerHTML = 'out'
        box.setAttribute('aria-hidden', 'true')
        box.classList.remove('inview')
    }

    // Update each box's class to reflect whether it was determined to be within the viewport or not
    function updateBoxes() {
        const options =
            sideStrategy === 'all'
                ? {
                      top: wvOptions.all,
                      right: wvOptions.all,
                      bottom: wvOptions.all,
                      left: wvOptions.all,
                  }
                : wvOptions

        if (method === 'async') {
            $boxes.forEach(function (box) {
                withinViewportAsync(box, options).then((result) => {
                    if (result) {
                        setBoxIsIn(box)
                    } else {
                        setBoxIsOut(box)
                    }
                })
            })
        } else {
            $boxes.forEach(function (box) {
                if (withinViewport(box, options)) {
                    setBoxIsIn(box)
                } else {
                    setBoxIsOut(box)
                }
            })
        }
    }

    window.addEventListener('load', init)
}

demo()
