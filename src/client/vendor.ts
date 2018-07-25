// Dependencies
import 'reflect-metadata/Reflect';
import 'zone.js/dist/zone';
import 'zone.js/dist/long-stack-trace-zone';

// Angular
import '@angular/core';
import '@angular/common';
import '@angular/common/http';
import '@angular/forms';
import '@angular/router';

// rxjs
import {Observable, Subscription, Subject, from, forkJoin, combineLatest} from 'rxjs';
import {map, flatMap, take, tap} from 'rxjs/operators';
