"use client";

import { InputOTP, REGEXP_ONLY_DIGITS } from "@heroui/react";

interface OtpFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Se dispara al teclear (o pegar) el sexto dígito. */
  onComplete?: (value: string) => void;
  isDisabled?: boolean;
  isInvalid?: boolean;
  autoFocus?: boolean;
  label: string;
}

/** Seis casillas para un código de un solo uso (login y alta del 2FA). */
export function OtpField({ value, onChange, onComplete, isDisabled, isInvalid, autoFocus, label }: OtpFieldProps) {
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={onChange}
      onComplete={onComplete ? (next: string) => onComplete(next) : undefined}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      aria-label={label}
      className="justify-center"
    >
      <InputOTP.Group>
        {[0, 1, 2].map((index) => (
          <InputOTP.Slot key={index} index={index} />
        ))}
      </InputOTP.Group>
      <InputOTP.Separator />
      <InputOTP.Group>
        {[3, 4, 5].map((index) => (
          <InputOTP.Slot key={index} index={index} />
        ))}
      </InputOTP.Group>
    </InputOTP>
  );
}
