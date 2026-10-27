from datetime import date
from types import SimpleNamespace as NS

from django.test import SimpleTestCase

from apps.savings.services import add_months, plan_stats

START, MATURITY = date(2026, 1, 1), date(2026, 7, 1)  # 181 days


def make_plan(**kw):
    base = dict(daily_amount=100, start_date=START, maturity_date=MATURITY, status="active")
    base.update(kw)
    return NS(**base)


def days(n, amount=100):
    return [NS(amount=amount, paid_on=date(2026, 1, 1 + i)) for i in range(n)]


class AddMonthsTests(SimpleTestCase):
    def test_month_end_does_not_overflow(self):
        self.assertEqual(add_months(date(2026, 8, 31), 6), date(2027, 2, 28))
        self.assertEqual(add_months(date(2026, 1, 1), 12), date(2027, 1, 1))


class PlanStatsTests(SimpleTestCase):
    today = date(2026, 1, 10)  # day 10 of the plan

    def stats(self, deposits, **plan):
        return plan_stats(make_plan(**plan), deposits, today=self.today)

    def test_target(self):
        s = self.stats([])
        self.assertEqual(s["total_days"], 181)
        self.assertEqual(s["target"], 18100)

    def test_on_track(self):
        s = self.stats(days(10))
        self.assertEqual((s["pace"], s["behind"]), ("ontrack", 0))

    def test_only_today_missing_is_due(self):
        s = self.stats(days(9))
        self.assertEqual((s["pace"], s["behind"]), ("due", 100))

    def test_older_days_missing_is_behind(self):
        s = self.stats(days(5))
        self.assertEqual((s["pace"], s["behind"]), ("behind", 500))

    def test_locked_before_maturity(self):
        s = self.stats(days(10))
        self.assertTrue(s["can_deposit"])
        self.assertFalse(s["can_withdraw"])

    def test_withdraw_opens_at_maturity_and_deposits_close(self):
        s = plan_stats(make_plan(), days(10), today=MATURITY)
        self.assertEqual(s["pace"], "matured")
        self.assertTrue(s["can_withdraw"])
        self.assertFalse(s["can_deposit"])

    def test_cannot_withdraw_while_payout_in_progress(self):
        s = plan_stats(make_plan(status="withdrawing"), days(10), today=MATURITY)
        self.assertFalse(s["can_withdraw"])

    def test_nothing_saved_means_nothing_to_withdraw(self):
        self.assertFalse(plan_stats(make_plan(), [], today=MATURITY)["can_withdraw"])
