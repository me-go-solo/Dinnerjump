import { Resend } from 'resend'

let _resend: Resend | undefined

export const resend = new Proxy({} as Resend, {
  get(_target, prop, receiver) {
    if (!_resend) {
      _resend = new Resend(process.env.RESEND_API_KEY!)
    }
    return Reflect.get(_resend, prop, receiver)
  },
})
