"use client"

import { getDrawerMethod, openDrawerViaPrinter } from "@/lib/utils/printer"

let cachedDevice: USBDevice | null = null

async function openViaUSB(): Promise<boolean> {
  if (!("usb" in navigator)) return false
  const usb = navigator as Navigator & { usb: USB }

  try {
    if (!cachedDevice || !cachedDevice.opened) {
      const devices = await usb.usb.getDevices()
      cachedDevice = devices.length > 0 ? devices[0] : null

      if (!cachedDevice) {
        try {
          cachedDevice = await usb.usb.requestDevice({ filters: [] })
        } catch {
          return false
        }
      }
    }

    if (!cachedDevice.opened) {
      try {
        await cachedDevice.open()
        if (cachedDevice.configuration === null) {
          await cachedDevice.selectConfiguration(1)
        }
        const iface = cachedDevice.configuration!.interfaces[0]
        if (iface && iface.interfaceNumber !== undefined) {
          await cachedDevice.claimInterface(iface.interfaceNumber)
        }
      } catch {
        cachedDevice = null
        return false
      }
    }

    await cachedDevice.transferOut(1, new Uint8Array([0x01]))
    return true
  } catch {
    return false
  }
}

export async function openCashDrawer(): Promise<boolean> {
  try {
    const method = getDrawerMethod()

    if (method === 'none') return false

    if (method === 'printer') {
      const ok = await openDrawerViaPrinter()
      if (ok) return true
      // Fallback to USB if printer drawer failed
      return await openViaUSB()
    }

    // USB method
    return await openViaUSB()
  } catch {
    return false
  }
}
