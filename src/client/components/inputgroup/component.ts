import {Component, Input, ViewChild, ElementRef, forwardRef} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR, AbstractControl} from '@angular/forms';
import {FormErrorParser} from '@core/index';

export const INPUT_GROUP_VALUE_ACCESSOR : any = {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => InputGroupComponent),
    multi: true,
};
  
@Component({
    selector: 'input-group',
    templateUrl: './template.html',
    styleUrls: ['./styles.scss'],
    providers: [INPUT_GROUP_VALUE_ACCESSOR]
})
export class InputGroupComponent implements ControlValueAccessor {
    @Input('id') id: string;
    @Input('type') type: string;
    @Input('label') label: string;
    @Input('name') name: string;
    @Input('formControl') control: AbstractControl;
    @Input('placeholder') placeholder?: string = '';
    @Input('autocomplete') autocomplete?: string = 'none';
    @Input('maxLength') maxLength?: number = 999;
    @Input('passwordButton') passwordButton?: boolean = false;
    @Input('showRequirements') showRequirements: boolean = false;

    @ViewChild('input') set input(i: ElementRef) {
        this.inputElement = i.nativeElement as HTMLInputElement;
    }
    
    pristine: boolean = true;
    blurred: boolean = false;
    focused: boolean = false;
    hasError: boolean = false;
    disabled: boolean = false;
    pwdShown: boolean = false;
    inputElement: HTMLInputElement;

    get hasPasswordError(): boolean {
        const err =  this.control.errors;
        return err && (err.passwordLength
            || err.passwordUppercase
            || err.passwordNumbers
            || err.passwordLowercase
            || err.passwordSymbols
            || err.passwordComplexity);
    }
    
    private _onChange: Function; 
    private _onTouch: Function; 

    writeValue(obj: any): void {
        this.inputElement.value = obj;
    }

    registerOnChange(fn: any): void {
        this._onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this._onTouch = fn;
    }

    setDisabledState?(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    onChange(event) {
        this.pristine = false;
        if (this._onChange) {
            this._onChange(this.inputElement.value);
            this.hasError = this.control.errors && Object.keys(this.control.errors).length > 0;
        }
    }

    onTouch(event) {
        if (this._onTouch) {
            this._onTouch();
        }
    }

    onBlur() {
        if (!this.blurred) {
            this.blurred = true;
        }
        this.focused = false;
    }

    onFocus() {
        if (!this.focused) {
            this.focused = true;
        }
        this.blurred = false;
    }

    getError(): string {
        if (!!this.control.errors){
            return FormErrorParser.parseErrors(this.label, this.control.errors);
        }
    }

    togglePwdVis() {
        if (this.pwdShown) {
            this.type = 'password';
        } else {
            this.type = 'text';
        }
        this.pwdShown = !this.pwdShown;
    }
}
