# Hermes-Plugins von mitarbyte

Plugins für [Hermes Agent](https://github.com/NousResearch/hermes-agent) und die Hermes-Desktop-App.
Jedes Plugin liegt in einem eigenen Ordner.

| Plugin | Wozu |
|---|---|
| [`zwischenablage`](zwischenablage/) | Strg+C/Strg+V zwischen deinem Rechner und dem Bot Screen, in beide Richtungen |

## Installieren

In der Desktop-App per Link (die App zeigt vorher, was installiert wird):

```
hermes://plugin/install?repo=Mitarbyte/hermes-plugins/<plugin>&enable=1
```

oder **Capabilities → Plugins → Install from Git** mit `Mitarbyte/hermes-plugins/<plugin>`.

Auf dem Rechner, auf dem Hermes läuft:

```sh
hermes plugins install Mitarbyte/hermes-plugins/<plugin>
hermes plugins enable <plugin>
```
