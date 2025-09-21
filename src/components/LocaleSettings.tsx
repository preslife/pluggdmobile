import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLocalization, SUPPORTED_LOCALES, LocaleCode } from '@/contexts/LocalizationContext';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDate, formatCurrency } from '@/lib/formatting';
import { Globe, Clock, DollarSign, Calendar, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const LocaleSettings = () => {
  const { settings, updateSettings, loading, detectUserLocale, getLocaleConfig } = useLocalization();
  const { t, locale } = useTranslation();
  const { toast } = useToast();
  
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  const handleSettingsChange = (field: keyof typeof localSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleLocaleChange = (newLocale: LocaleCode) => {
    const config = getLocaleConfig(newLocale);
    setLocalSettings(prev => ({
      ...prev,
      locale: newLocale,
      currency: config.currency,
      timezone: config.timezone
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(localSettings);
      toast({
        title: t('success.saved'),
        description: t('settings.language') + ' ' + t('success.updated')
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('errors.unknownError'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAutoDetect = () => {
    const detectedLocale = detectUserLocale();
    handleLocaleChange(detectedLocale);
    toast({
      title: t('settings.autoDetect'),
      description: `${t('settings.language')}: ${SUPPORTED_LOCALES[detectedLocale].name}`
    });
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(localSettings);

  // Get timezone options (common timezones for the selector)
  const commonTimezones = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'America/Toronto',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  return (
    <div className="space-y-6">
      {/* Current Locale Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('settings.language')} & {t('settings.currency')}
          </CardTitle>
          <CardDescription>
            {t('settings.general')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locale">{t('settings.language')}</Label>
              <Select
                value={localSettings.locale}
                onValueChange={(value: LocaleCode) => handleLocaleChange(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.language')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUPPORTED_LOCALES).map(([code, config]) => (
                    <SelectItem key={code} value={code}>
                      <div className="flex items-center gap-2">
                        <span>{config.flag}</span>
                        <span>{config.name}</span>
                        {code === settings.locale && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">{t('settings.currency')}</Label>
              <Select
                value={localSettings.currency}
                onValueChange={(value: string) => handleSettingsChange('currency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.currency')} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(Object.values(SUPPORTED_LOCALES).map(l => l.currency))).map(currency => (
                    <SelectItem key={currency} value={currency}>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>{currency}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoDetect}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {t('settings.autoDetect')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Date & Time Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('settings.dateFormat')} & {t('settings.timeFormat')}
          </CardTitle>
          <CardDescription>
            How dates and times are displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFormat">{t('settings.dateFormat')}</Label>
              <Select
                value={localSettings.dateFormat}
                onValueChange={(value: 'auto' | 'custom') => handleSettingsChange('dateFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.dateFormat')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{t('settings.autoDetect')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{t('settings.custom')}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeFormat">{t('settings.timeFormat')}</Label>
              <Select
                value={localSettings.timeFormat}
                onValueChange={(value: '12h' | '24h') => handleSettingsChange('timeFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('settings.timeFormat')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">{t('settings.twelveHour')}</SelectItem>
                  <SelectItem value="24h">{t('settings.twentyFourHour')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">{t('settings.timezone')}</Label>
            <Select
              value={localSettings.timezone}
              onValueChange={(value: string) => handleSettingsChange('timezone', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('settings.timezone')} />
              </SelectTrigger>
              <SelectContent>
                {commonTimezones.map(tz => (
                  <SelectItem key={tz} value={tz}>
                    <div className="flex items-center justify-between w-full">
                      <span>{tz}</span>
                      <Badge variant="outline" className="ml-2">
                        {new Intl.DateTimeFormat('en', {
                          timeZone: tz,
                          timeZoneName: 'short'
                        }).formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>{t('common.preview')}</CardTitle>
          <CardDescription>
            See how your settings will look
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Date Format</Label>
            <p className="text-sm bg-muted p-2 rounded">
              {formatDate(new Date(), {
                locale: localSettings.locale,
                timezone: localSettings.timezone,
                dateStyle: 'full'
              })}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Time Format</Label>
            <p className="text-sm bg-muted p-2 rounded">
              {formatDate(new Date(), {
                locale: localSettings.locale,
                timezone: localSettings.timezone,
                timeStyle: 'medium',
                timeFormat: localSettings.timeFormat
              })}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Currency Format</Label>
            <p className="text-sm bg-muted p-2 rounded">
              {formatCurrency(1234.56, {
                locale: localSettings.locale,
                currency: localSettings.currency
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                You have unsaved changes
              </p>
              <Button
                onClick={handleSave}
                disabled={saving || loading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};