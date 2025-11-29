export type ValidationError = {
	varName: string;
	line: number | "?";
	column: number | "?";
};
