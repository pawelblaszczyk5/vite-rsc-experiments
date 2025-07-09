"use client";

import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({ heading: { color: "green" } });

export const Heading = () => <h2 {...stylex.props(styles.heading)}>Foo bar</h2>;
