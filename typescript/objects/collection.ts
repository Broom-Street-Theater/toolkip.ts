namespace KIP {

	/**...........................................................................
	 * CollectionTypeEnum
	 * ...........................................................................
	 * Keeps track of the different ways we can add to a collection
	 * ...........................................................................
	 */
	export enum CollectionTypeEnum {
		ReplaceDuplicateKeys = 1,
		IgnoreDuplicateKeys = 2
	}

	//#region INTERFACES

	/**...........................................................................
	 * CollectionSortFunction
	 * ...........................................................................
	 * Sort a collection, same as one would sort an array
	 * 
	 * @param	a	The first element to compare
	 * @param	b	The second element to compare
	 * 
	 * @returns	-1 if the elements are in the wrong order, 1 if they are in the correct order, 0 if they are the same
	 * ...........................................................................
	 */
	export interface CollectionSortFunction<T> {
		(a: ICollectionElement<T>, b: ICollectionElement<T>): number;
	}

	/**...........................................................................
	 * SortFunction
	 * ...........................................................................
	 * General sort function for comparing two elements of any type
	 * 
	 * @param	a	The first element to compare
	 * @param	b	The second element to compare
	 * 
	 * @returns	-1 if the elements are in the wrong order, 1 if they are in the correct order, 0 if they are the same
	 * ...........................................................................
	 */
	export interface SortFunction<T> {
		(a: T, b: T): number;
	}

	/**...........................................................................
	 * EqualityFunction
	 * ...........................................................................
	 * Check if two elements are equal
	 * ...........................................................................
	 */
	export interface EqualityFunction<T> {
		(a: T, b: T): boolean;
	}

	/**...........................................................................
	 * ICollectionElement
	 * ...........................................................................
	 * The class that stores data within a collection
	 * ...........................................................................
	 */
	export interface ICollectionElement<T> {

		/** the key this element is stored under */
		key: string;

		/** the actual value for the element */
		value: T;

		/** where the element sits in the sorted index */
		sortedIdx: number;

		/** where the element was originally added */
		origIdx: number;
	}

	/**...........................................................................
	 * IDisctionaryKeys
	 * ...........................................................................
	 * The array that provides the key index within a collection 
	 * ...........................................................................
	 */
	export interface IDictionaryKeys<T> {
		[key: string]: ICollectionElement<T>;
	}
	//#endregion

	export class Collection<T> extends NamedClass implements IEquatable<Collection<T>> {

		//#region PROPERTIES

		/** Tracks of the data in this collection */
		private _data: IDictionaryKeys<T>; 

		/** allow retrieval of a set of keys */
		public get keys(): string[] { return Object.keys(this._data); }

		/** Stores the sorted array of keys for the collection */
		private _sortedData: Array<string>; 

		/** Whether we should augment or replace in this collection  */
		private _addType: CollectionTypeEnum;
		public set addType (addType: CollectionTypeEnum) { this._addType = addType; }

		/** internal counter for the iteration we are currently on */
		private _iteration: number;
		public get iteration(): number { return this._iteration; }

		/** get the current number of elements in our collection */
		public get length(): number { return this._sortedData.length; }

		/** what to use to check for two elements being equal */
		protected _equalityTest: EqualityFunction<T>;
		public set equalityTest (test: EqualityFunction<T>) { this._equalityTest = test; };

		//#endregion

		/**...........................................................................
		 * Creates the collection
		 * @param  {boolean} replace True if we should override the values in the list
		 * @return Collection
		 * ...........................................................................
		 */
		constructor(type?: CollectionTypeEnum, eq_test?: EqualityFunction<T>) {
			super("Collection");

			// Initialize our arrays
			this._data = {};
			this._sortedData = new Array<string>();

			// Store whether we should be replacing
			this._addType = type || CollectionTypeEnum.IgnoreDuplicateKeys;

			this._equalityTest = eq_test;
			if (!this._equalityTest) {
				this._equalityTest = ((a: T, b: T) => {
					return (a === b);
				});
			}
		}

		/**...........................................................................
		 * addElement
		 * ...........................................................................
		 * Adds an element to the collection
		 * @param 	key  	The key to uniquely identify this element
		 * @param 	val 	The element to add to our collection
		 * @returns True if the element was successfully added
		 * ...........................................................................
		 */
		public addElement(key: string, val: T): number {
			let idx: number;
			let elem: ICollectionElement<T>;
			let sortedIdx: number;
			let skipSortedPush: boolean;

			// Verify that there isn't anything currently linked to this key
			if ((this._addType === CollectionTypeEnum.IgnoreDuplicateKeys) && (this._data[key])) {
				return -1;
			}

			// If we already have data, we don't need to add this key to our sorted index again
			if (this._data[key]) { skipSortedPush = true; }

			// Grab the spot that this element will be added to in our sorted index
			sortedIdx = this._sortedData.length;

			// Create our new object
			elem = {
				key: key,
				value: val,
				sortedIdx: sortedIdx,
				origIdx: sortedIdx
			};

			// If there isn't anything in this index (or we should replace it), save our new value
			this._data[key] = elem;

			// Push to our sorted index if needed
			if (!skipSortedPush) { this._sortedData.push(key); }

			return sortedIdx;
		}

		/**...........................................................................
		 * insertElement
		 * ...........................................................................
		 * inserts an element at a particular index 
		 * ...........................................................................
		 */
		public insertElement(key: string, elem: T, index: number): boolean {
			//TODO
			return true;
		}

		/**...........................................................................
		 * removeElement
		 * ...........................................................................
		 * remove the element with the provided key 
		 * ........................................................................... 
		 */
		public removeElement(key: string): ICollectionElement<T>;
		
		/**...........................................................................
		 * removeElement
		 * ...........................................................................
		 * remove the element at the provided index 
		 * ........................................................................... 
		 */
		public removeElement(idx: number): ICollectionElement<T>;

		/**...........................................................................
		 * removeElement
		 * ...........................................................................
		 * combination function to handle all overloads 
		 * ...........................................................................
		 */
		public removeElement(param: string | number): ICollectionElement<T> {

			if (typeof param === "string") {
				return this._removeElementByKey(param as string);
			} else if (typeof param === "number") {
				return this._removeElementByIndex(param as number);
			}
		}

		/**...........................................................................
		 * removeElementByValue
		 * ...........................................................................
		 *  remove the element that matches the provided element 
		 * ........................................................................... 
		 */
		public removeElementByValue(value: T): ICollectionElement<T> {
			return this._removeElementByValue(value);
		}

		/**...........................................................................
		 * _removeElementByKey
		 * ...........................................................................
		 *  removes an element by key 
		 * ........................................................................... 
		 */
		protected _removeElementByKey(key: string): ICollectionElement<T> {
			let elem: ICollectionElement<T>;

			elem = this._data[key];

			if (!elem) return null;

			// Remove from the sorted array
			this._sortedData.splice(elem.sortedIdx, 1);

			// Reset sorted keys for all others in the array
			this._resetSortedKeys(elem.sortedIdx);

			// Remove from the actual data array
			delete this._data[key];

			// Return the grabbed data
			return elem;
		}

		/**...........................................................................
		 * _removeElementByIndex
		 * ...........................................................................
		 * removes an element by index 
		 * ........................................................................... 
		 */
		protected _removeElementByIndex(idx: number): ICollectionElement<T> {
			let key: string;

			if ((idx >= this.length) || (idx < 0)) {
				return null;
			}

			key = this._sortedData[idx];
			return this._removeElementByKey(key);
		}

		/**...........................................................................
		 * _removeElementByValue
		 * ...........................................................................
		 * removes an element by matching the element to the provided element 
		 * ........................................................................... 
		 */
		protected _removeElementByValue(val: T): ICollectionElement<T> {
			let key: string;
			let e: ICollectionElement<T>;
			e = this._findElement(val);
			return this._removeElementByKey(e && e.key);
		}

		/**...........................................................................
		 * _resetSortedKeys
		 * ...........................................................................
		 * Ensure that the key stored with the element matches its location in the 
		 * sorted array 
		 * ........................................................................... 
		 */
		private _resetSortedKeys(startFrom?: number, endWith?: number) {

			// Set some defaults
			if (!startFrom) { startFrom = 0; }
			if (!endWith && (endWith !== 0)) { endWith = this._sortedData.length; }

			if (startFrom > endWith) { return; }

			if (startFrom > endWith) { 
				let tmp: number = startFrom;
				startFrom = endWith;
				endWith = tmp;
			}

			let e: ICollectionElement<T>;
			let k: string;
			for (let i: number = startFrom; i < endWith; i += 1) {
				k = this._sortedData[i];
				if (!k) continue;

				e = this._data[k];
				if (!e) continue;

				e.sortedIdx = i;
			}
		}

		public clear() {
			this._data = {};
			this._sortedData = [];
		}

		/**...........................................................................
		 * sort
		 * ...........................................................................
		 * Sorts the collection
		 * @param 	sort_func   	The function we should use to sort
		 * ...........................................................................
		 */
		public sort(sort_func: CollectionSortFunction<T>) {
			let sTemp: SortFunction<string>;

			// Generate our wrapper sort function to guarantee we have the real elements
			// sent to the passed-in sort function
			sTemp = ((a: string, b: string) => {
				let a_tmp: ICollectionElement<T>;
				let b_tmp: ICollectionElement<T>;

				a_tmp = this._data[a];
				b_tmp = this._data[b];

				return sort_func(a_tmp, b_tmp);
			});

			// Sort the data appropriately
			this._sortedData.sort(sTemp);

			// Make sure we update our indices appropriately
			this._resetSortedKeys();
		}

		/**...........................................................................
		 * resetLoop
		 * ...........................................................................
		 * Resets our iteration counter
		 * 
		 * @param	reverse		If true, loops through backwards
		 * ...........................................................................
		 */
		public resetLoop(reverse?: boolean): void {
			if (reverse) {
				this._iteration = (this.length + 1);
			} else {
				this._iteration = -1;
			}
		}

		/**...........................................................................
		 * hasNext
		 * ...........................................................................
		 * Checks if we have a next element available for getting
		 * 
		 * @param 	reverse 	True if we should loop backwards
		 * 
		 * @returns True if there is a next element available
		 * ...........................................................................
		 */
		public hasNext(reverse?: boolean): boolean {
			if (reverse) {
				return ((this._iteration - 1) >= 0);
			} else {
				return ((this._iteration + 1) < this._sortedData.length);
			}
		}

		/**...........................................................................
		 * getNext
		 * ...........................................................................
		 * Finds the next element in our loop
		 * 
		 * @param 	reverse 	True if we should loop backwards
		 * 
		 * @returns The element next in our array
		 * ...........................................................................
		 */
		public getNext(reverse?: boolean): ICollectionElement<T> {

			// Grab the next appropriate index
			if (reverse) {
				this._iteration -= 1;
			} else {
				this._iteration += 1;
			}

			// Get the data from that index
			return this._data[this._sortedData[this._iteration]];
		}

		public getCurrent(): ICollectionElement<T> {
			if (this._iteration === -1) { return null; }
			return this._data[this._sortedData[this._iteration]];
		}

		/**...........................................................................
		 * toArray
		 * ...........................................................................
		 * Return a sorted array of the elements in this collection
		 * ...........................................................................
		 */
		public toArray(): Array<ICollectionElement<T>> {
			let arr: ICollectionElement<T>[];
			let key: string;

			for (key of this._sortedData) {
				arr.push(this._data[key]);
			}

			return arr;
		}

		/**
		 * toValueArray
		 * 
		 * Get an array of just the values in this collection
		 */
		public toValueArray(): Array<T> {
			let arr: T[] = [];
			this.map((value: T) => {
				arr.push(value);
			});
			return arr;
		}

		/**...........................................................................
		 * getElement
		 * ...........................................................................
		 * @param key 
		 * ...........................................................................
		 */
		public getElement(key: string): ICollectionElement<T>;

		/**...........................................................................
		 * getElement
		 * ...........................................................................
		 * @param idx 
		 * ...........................................................................
		 */
		public getElement(idx: number): ICollectionElement<T>;

		/**...........................................................................
		 * getElement
		 * ...........................................................................
		 * @param param 
		 * ...........................................................................
		 */
		public getElement(param: string | number): ICollectionElement<T> {
			let out: ICollectionElement<T>;

			// Handle the param being a key
			if (typeof param === "string") {
				out = this._data[param];

				// Handle the parm being index
			} else if (typeof param === "number") {
				if ((param < 0) || (param > this._sortedData.length)) { return null; }
				out = this._data[this._sortedData[param]];
			}

			return out;
		}

		/**...........................................................................
		 * getValue
		 * ...........................................................................
		 * 
		 * @param 	key		The key for which we should grab the value 
		 * ...........................................................................
		 */
		public getValue(key: string): T;

		/**...........................................................................
		 * getValue
		 * ...........................................................................
		 * 
		 * @param 	idx 	The index for which we should grab the value
		 * ...........................................................................
		 */
		public getValue(idx: number): T;

		/**...........................................................................
		 * getValue
		 * ...........................................................................
		 * 
		 * @param	param
		 * ...........................................................................
		 */
		public getValue(param: string | number): T {
			let pair: ICollectionElement<T>;
			pair = this.getElement(param as string);
			if (!pair) { return null; }
			return pair.value;
		}

		/**...........................................................................
		 * getIndex
		 * ...........................................................................
		 * 
		 * @param key 
		 * ...........................................................................
		 */
		public getIndex(key: string): number;

		/**...........................................................................
		 * getIndex
		 * ...........................................................................
		 * @param val 
		 * ...........................................................................
		 */
		public getIndex(val: T): number;

		/**...........................................................................
		 * getIndex
		 * ...........................................................................
		 * 
		 * @param param 
		 * ...........................................................................
		 */
		public getIndex(param: string | T): number {

			if (typeof param === "string") {
				return (this._data[param] && this._data[param].sortedIdx);
			} else {
				let e: ICollectionElement<T>;
				e = this._findElement(param);
				return (e && e.sortedIdx);
			}
		}

		/**...........................................................................
		 * _findElement
		 * ...........................................................................
		 * 
		 * @param val 
		 * ...........................................................................
		 */
		private _findElement(val: T): ICollectionElement<T> {
			let key: string;
			let elem: ICollectionElement<T>;

			// loop over everything in our data array
			for (key in this._data) {
				if (this._data.hasOwnProperty(key)) {
					elem = this._data[key];

					if (this._equalityTest(elem.value, val)) {
						return elem;
					}
				}
			}

			return null;
		}

		public getKey(idx: number): string;
		public getKey(val: T): string;
		public getKey(param: number | T): string {
			if (typeof param === "number") {
				return this._sortedData[param];
			} else {
				let e: ICollectionElement<T>;
				e = this._findElement(param);
				return (e && e.key);
			}
		}

		public hasElement(key: string): boolean;
		public hasElement(val: T): boolean;
		public hasElement(idx: number): boolean;
		public hasElement(param: string | T | number): boolean {
			if (typeof param === "string") {
				return (!!this._data[param]);
			} else if (typeof param === "number") {
				return ((!!this._sortedData[param]) && (!!this._data[this._sortedData[param]]));
			} else {
				return (this._findElement(param) !== null);
			}
		}

		/**...........................................................................
		 * map
		 * ...........................................................................
		 * handle looping through the collection to get each element 
		 * ........................................................................... 
		 */
		public map (mapFunc: IMapFunction<T>): void {
			if (!mapFunc) { return; }

			this.resetLoop();
			while (this.hasNext()) {
				let pair: ICollectionElement<T> = this.getNext();
				if (!pair) { continue; }

				let value: T = pair.value;
				let key: string = pair.key;
				let idx: number = this.getIndex(key);

				mapFunc(value, key, idx);
			}
			this.resetLoop();
		}

		/**...........................................................................
		 * toString
		 * ...........................................................................
		 * Turns this collection into a human readable string
		 * 
		 * @returns	The string version of the collection
		 * ...........................................................................
		 */
		public toString(): string {
			let outStr: string = "";
			this.map((elem: T, key: string, idx: number) => {
				if (outStr.length > 0) { outStr += ", "; }
				outStr += format("{0} => {1}", key, elem.toString());
			});
			return outStr;
		}

		/**...........................................................................
		 * equals
		 * ...........................................................................
		 * Determins if this Collection us equal in value to another
		 * 
		 * @param	other	The collection to compare to
		 * 
		 * @returns	True if the collection is a match for our own
		 * ...........................................................................
		 */
		public equals(other: Collection<T>): boolean {

			// quick check: determine if the lengths are mismatched
			if (this.length !== other.length) { return false; }

			// check if the sorted array is mismatched
			if (this._sortedData.length !== other._sortedData.length) { return false; }

			// verify our key arrays match
			let mismatch: boolean = false;
			this.map((elem: T, key: string, idx: number) => {

				// check that this key exists in the other collection
				if (!other._data[key]) {
					mismatch = true;
				}

				// determine if the two elements are equal
				if (!equals(elem, other._data[key].value)) { 
					mismatch = true;
				}
			});

			// quit if we were mismatched
			if (mismatch) { return false; }

			// If we made it this far, we should consider the collections the same
			return true;
		}

	}
}

