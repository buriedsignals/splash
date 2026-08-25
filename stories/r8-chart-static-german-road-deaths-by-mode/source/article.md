# The e-bike is now the deadliest way to cycle in Germany

Germany's roads have been getting safer for a decade. In 2015, 3 459 people were killed in road
traffic accidents; in 2025, 2 832 were. One group has moved the other way.

The Federal Statistical Office (Destatis) put it plainly in its press release of 27 April 2026:

> "Wie das Statistische Bundesamt (Destatis) mitteilt, war im Jahr 2025 nach vorläufigen Ergebnissen
> jede sechste (16,4 %) im Straßenverkehr getötete Person mit dem Fahrrad unterwegs."

— *as Destatis reports, in 2025, according to preliminary results, one in six (16.4%) people killed
in road traffic was travelling by bicycle.*

The same release says 462 cyclists died in 2025, 217 of them on a pedelec — the German statistical
term for a pedal-assist e-bike capped at 25 km/h — and that the number of cyclists killed rose 3.8%
on the year and 20.6% on 2015. "Der Anstieg ist auf die zunehmende Zahl von getöteten
Pedelec-Nutzenden zurückzuführen (2024: 195 Getötete; 2015: 36 Getötete)": the increase is due to the
rising number of pedelec users killed.

Destatis also reports that 61.5% of the cyclists killed in 2025 were 65 or older, and that the share
was higher among pedelec riders (67.3%) than among riders of bicycles without a motor (56.3%).

The office's July release on e-scooters records a different order of magnitude: 16 496 e-scooter
accidents with personal injury in 2025, up 38.1% on 2024, and 38 people killed, against 27 in 2024.

## Where these numbers come from

The chart in this piece is drawn from the Federal Statistical Office's own long time series, table
46241-11, *Getötete — nach Art der Verkehrsbeteiligung und Ortslage* (people killed, by mode of
travel and by location), published as part of *Statistischer Bericht — Verkehrsunfälle Zeitreihen*.
It runs from 1979 to 2025 and gives, for each year, the number of people killed in German road
traffic by the vehicle they were travelling in or on, split three ways: inside built-up areas,
outside built-up areas, and both together.

- Publisher: Statistisches Bundesamt (Destatis), Wiesbaden
- File: `statistischer-bericht-verkehrsunfaelle-zeitreihen-5462403.xlsx`, sheet `csv-46241-11`
- URL: https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Verkehrsunfaelle/Publikationen/Downloads-Verkehrsunfaelle/statistischer-bericht-verkehrsunfaelle-zeitreihen-5462403.xlsx
- SHA-256 of the downloaded workbook: 4fda91bf992a773ff6cea56f98477e37b547ddddd84f4102260770ebf22e93ae
- Retrieved: 23 August 2026. Table status ("Stand"): 7 July 2026.
- Licence: Destatis data, © Statistisches Bundesamt (Destatis), 2026, Datenlizenz Deutschland
  Namensnennung 2.0.

Two things about the file matter for anyone reading a chart off it.

**The bicycle is not one column.** Up to 2013 the table has a single column,
`Getoetete_Fahrraeder_bis_2013`. From 2014 it has two, `Getoetete_Fahrraeder_ohne_Elektroantrieb_ab_2014`
and `Getoetete_Pedelecs_ab_2014`, and the pre-2014 column is empty. Every cell that does not apply to
a year is written as a hyphen, not as a zero and not as a blank. A total for "cyclists killed" before
2014 and after 2014 is therefore two different additions, and a series that runs a single "bicycle"
column across the break will show a cliff that is an accounting change, not a road.

**The e-scooter column starts in 2021.** `Getoetete_Elektrokleinstfahrzeuge` is a hyphen for every
year up to and including 2020; Germany legalised e-scooters in June 2019 and the statistic separates
them from 2021.

**The April figures were preliminary.** The 27 April 2026 press release says so in its own sentence
("nach vorläufigen Ergebnissen"). The July time series is the revised one, and it does not carry the
same numbers: it gives 214 pedelec deaths for 2025 where the April release said 217, and 2 832 road
deaths in total where the April release's percentages imply about 2 817.

## The reading this piece takes

Over the ten years to 2025 the number of people killed on German roads fell by 18%. The number
killed while riding a pedelec rose from 36 to 214 — close to six times as many. Deaths among riders
of bicycles without a motor fell over the same period, from 347 to 248. On the published table, the
pedelec is the only mode of travel in Germany whose annual death toll is several times what it was a
decade ago.
