'use client';
/* eslint-disable @next/next/no-img-element -- the map's status bugs, like BrandBug. */
import styles from './filter-choices.module.css';

export type FilterChoice<T extends string | number> = { value: T; label: string; bug?: string };

/** One filter as a row of tappable choices (radio buttons), so every option is visible at once. */
export function FilterChoices<T extends string | number>({ legend, name, value, choices, disabled, onChange }: {
  legend: string;
  name: string;
  value: T;
  choices: ReadonlyArray<FilterChoice<T>>;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return <fieldset className={styles.group} disabled={disabled}>
    <legend>{legend}</legend>
    <div className={styles.choices}>
      {choices.map(choice => <label key={String(choice.value)} className={styles.choice}>
        <input type="radio" name={name} checked={value === choice.value} onChange={() => onChange(choice.value)} />
        {choice.bug ? <img src={choice.bug} alt="" aria-hidden="true" width={16} height={16} /> : null}
        <span>{choice.label}</span>
      </label>)}
    </div>
  </fieldset>;
}
